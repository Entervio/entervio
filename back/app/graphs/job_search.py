import logging
from typing import Any, Literal, TypedDict

from langchain_core.prompts import ChatPromptTemplate
from langchain_groq import ChatGroq
from langgraph.graph import END, StateGraph
from pydantic import BaseModel, Field

from app.core.config import settings
from app.services.francetravail_service import francetravail_service
from app.services.location_service import location_service

logger = logging.getLogger(__name__)


# --- State Definition ---
class JobSearchState(TypedDict):
    """State for the Job Search Graph."""

    user_query: str
    user_profile: str  # Summarized user profile
    structured_params: dict[str, Any]  # Params extracted by LLM
    results: list[dict[str, Any]]
    final_response: str
    attempt_count: int


# --- Pydantic Model for LLM Extraction ---
class SearchParameters(BaseModel):
    """
    Structured parameters for the France Travail API.
    Extract these from the user's natural language query and profile.
    """

    keywords: str = Field(
        description="Main keywords for the job search (e.g. 'Développeur Python', 'Commercial')."
    )

    # Geographic params
    location_type: Literal["commune", "departement", "region", "national"] = Field(
        description="Type of location constraint. 'national' if no specific location."
    )
    location_value: str | None = Field(
        description="The code or name. For 'commune': city name or code. For 'departement': dept code (e.g. '33'). For 'region': region code (e.g. '76')."
    )

    # Filters
    experience_exigence: Literal["D", "S", "E"] | None = Field(
        description="D: Beginner accepted (use if 'junior' or <1 year exp). S: Desired. E: Required (senior)."
    )
    experience_level: Literal["1", "2", "3"] | None = Field(
        description="1: <1 year (Junior), 2: 1-3 years, 3: >3 years (Senior)."
    )
    contract_type: Literal["CDI", "CDD", "MIS", "ALE"] | None = Field(
        description="Contract type code."
    )
    is_full_time: bool | None = Field(description="True if full-time is requested.")

    reasoning: str = Field(
        description="Brief explanation of why these parameters were chosen (especially the location mapping)."
    )


# --- Constants: Region Map ---
REGION_MAP = """
01: Guadeloupe
02: Martinique
03: Guyane
04: La Réunion
06: Mayotte
11: Île-de-France (Paris, suburbs)
24: Centre-Val de Loire
27: Bourgogne-Franche-Comté
28: Normandie
32: Hauts-de-France (Lille, Nord)
44: Grand Est (Strasbourg, Alsace)
52: Pays de la Loire (Nantes)
53: Bretagne (Rennes, Brest)
75: Nouvelle-Aquitaine (Bordeaux, Poitiers, Limoges)
76: Occitanie (Toulouse, Montpellier)
84: Auvergne-Rhône-Alpes (Lyon, Grenoble)
93: Provence-Alpes-Côte d'Azur (Marseille, Nice, Cannes, 'Sud', 'Sud-Est')
94: Corse
"""

# --- Nodes ---


def resolve_parameters_node(state: JobSearchState):
    """
    Node 1: Analyze query and profile to extract strict search parameters.
    Handles 'Sud de France' -> Region Code mapping.
    """
    logger.info(f" [Graph] Analyzing query: {state['user_query']}")

    llm = ChatGroq(
        temperature=0, model="llama-3.3-70b-versatile", api_key=settings.GROQ_API_KEY
    )

    # Force structured output
    structured_llm = llm.with_structured_output(SearchParameters)

    system_prompt = f"""You are an expert Job Search Assistant for France.
    Your goal is to convert natural language queries into strict parameters for the France Travail API.

    ### LOCATION MAPPING RULES (CRITICAL)
    The API requires specific CODES.
    - If the user says "Sud de France" or "South", map it to the most relevant REGION code(s). usually Occitanie (76) or PACA (93). If vague, pick the most likely or 'national'.
    - If the user says "Paris", use Department "75".
    - If the user says "Lyon", use Commune "69123" or Department "69".
    - If the user implies Junior/Beginner, set experience_exigence="D" and experience_level="1".

    ### REFERENCE: REGION CODES
    {REGION_MAP}

    ### USER PROFILE CONTEXT
    {state.get("user_profile", "No profile")}
    """

    prompt = ChatPromptTemplate.from_messages(
        [("system", system_prompt), ("human", "{query}")]
    )

    # Invoke
    chain = prompt | structured_llm
    params: SearchParameters = chain.invoke({"query": state["user_query"]})

    logger.info(f" [Graph] Resolved Params: {params.model_dump()}")

    return {"structured_params": params.model_dump()}


async def execute_search_node(state: JobSearchState):
    """
    Node 2: Execute the search using FranceTravailService.
    """
    params = state["structured_params"]
    logger.info(f"🔎 [Graph] Executing search with: {params}")

    ft_params = {
        "keywords": params["keywords"],
        "contract_type": params["contract_type"],
        "is_full_time": params["is_full_time"],
        "experience": params["experience_level"],
        "experience_exigence": params["experience_exigence"],
        "distance": 30,  # default
    }

    # Handle Location Logic
    loc_type = params["location_type"]
    loc_val = params["location_value"]

    if loc_type == "region":
        ft_params["region"] = loc_val
    elif loc_type == "departement":
        ft_params["departement"] = loc_val
    elif loc_type == "commune":
        # If the LLM gave a city NAME (e.g. "Lyon"), we should resolve it to a code for better accuracy
        if loc_val and not loc_val.isdigit():
            cities = await location_service.search_cities(loc_val)
            if cities:
                ft_params["location"] = cities[0]["code"]
            else:
                ft_params["location"] = loc_val  # Fallback
        else:
            ft_params["location"] = loc_val

    # Execute
    results = await francetravail_service.search_jobs(**ft_params)

    logger.info(f"✅ [Graph] Found {len(results)} jobs.")
    return {"results": results}


# --- Graph Construction ---


def build_job_search_graph():
    workflow = StateGraph(JobSearchState)

    workflow.add_node("resolve_parameters", resolve_parameters_node)
    workflow.add_node("execute_search", execute_search_node)

    workflow.set_entry_point("resolve_parameters")

    workflow.add_edge("resolve_parameters", "execute_search")
    workflow.add_edge("execute_search", END)

    return workflow.compile()


# Singleton
job_search_graph = build_job_search_graph()
