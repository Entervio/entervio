import logging
import time

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)


class FranceTravailService:
    BASE_URL = "https://api.francetravail.io"
    AUTH_URL = "https://entreprise.francetravail.fr/connexion/oauth2/access_token?realm=%2Fpartenaire"
    SEARCH_URL = "/partenaire/offresdemploi/v2/offres/search"

    def __init__(self):
        self.access_token = None
        self.token_expiry = 0

    async def _get_access_token(self) -> str:
        if self.access_token and time.time() < self.token_expiry:
            return self.access_token

        async with httpx.AsyncClient() as client:
            response = await client.post(
                self.AUTH_URL,
                data={
                    "grant_type": "client_credentials",
                    "client_id": settings.FRANCE_TRAVAIL_CLIENT_ID,
                    "client_secret": settings.FRANCE_TRAVAIL_CLIENT_SECRET,
                    "scope": "api_offresdemploiv2 o2dsoffre",
                },
                headers={"Content-Type": "application/x-www-form-urlencoded"},
            )
            response.raise_for_status()
            data = response.json()
            self.access_token = data["access_token"]
            # Set expiry slightly before actual expiry (expires_in is in seconds)
            self.token_expiry = time.time() + data["expires_in"] - 60
            return self.access_token

    async def search_jobs(
        self, keywords: str, location: str | None = None, distance: int = 25, **kwargs
    ) -> list[dict]:
        token = await self._get_access_token()

        params = {
            "motsCles": keywords,
            "range": "0-49",  # Limit to 50 results
        }

        # Add advanced filters
        if kwargs.get("contract_type"):
            params["typeContrat"] = kwargs["contract_type"]  # e.g. "CDI", "CDD"

        if kwargs.get("is_full_time"):
            params["tempsPlein"] = kwargs["is_full_time"]

        if kwargs.get("sort_by") == "date":
            params["sort"] = 1

        # Experience level: 0 (not specified), 1 (<1 year), 2 (1-3 years), 3 (>3 years)
        if kwargs.get("experience"):
            params["experience"] = kwargs["experience"]

        # Experience requirement: D (beginner), S (desired), E (required)
        if kwargs.get("experience_exigence"):
            params["experienceExigence"] = kwargs["experience_exigence"]

        # Grand domaine (domain code like M18 for IT, D for Sales, etc.)
        if kwargs.get("grand_domaine"):
            params["grandDomaine"] = kwargs["grand_domaine"]

        # Published since (in days)
        if kwargs.get("published_since"):
            params["publieeDepuis"] = kwargs["published_since"]

        if location:
            # If location is a zip code or INSEE code (5 digits), use it directly
            # Otherwise, we assume it's a code passed from SmartJobService
            # The caller (SmartJobService) is responsible for resolving names to codes.

            if location.isdigit() and len(location) == 2:
                # If 2 digits, treat as department code (e.g. "33" for Gironde)
                params["departement"] = location
            elif location == "75056" or location.startswith("75"):
                # Special case for Paris: use department 75 if it's Paris
                params["departement"] = "75"
            else:
                params["commune"] = location
                params["distance"] = distance

        async with httpx.AsyncClient() as client:
            logger.info(f"DEBUG: France Travail access token: {token}")
            response = await client.get(
                f"{self.BASE_URL}{self.SEARCH_URL}",
                headers={"Authorization": f"Bearer {token}"},
                params=params,
            )

            if response.status_code == 204:  # No content
                return []

            response.raise_for_status()
            data = response.json()
            return data.get("resultats", [])


francetravail_service = FranceTravailService()
