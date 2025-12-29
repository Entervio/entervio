from typing import Any

import httpx


class LocationService:
    GEO_API_URL = "https://geo.api.gouv.fr/communes"
    REGION_API_URL = "https://geo.api.gouv.fr/regions"
    DEPT_API_URL = "https://geo.api.gouv.fr/departements"

    async def search_cities(self, query: str) -> list[dict[str, Any]]:
        if not query or len(query) < 2:
            return []

        params = {
            "fields": "nom,code,codesPostaux,departement,region",
            "boost": "population",
            "limit": 10,
        }

        if query.isdigit() and len(query) == 5:
            params["codePostal"] = query
        else:
            params["nom"] = query

        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(self.GEO_API_URL, params=params)
                response.raise_for_status()
                return response.json()
            except Exception as e:
                print(f"Error fetching cities: {e}")
                return []

    async def search_regions(self, query: str) -> list[dict[str, Any]]:
        """Search for regions by name."""
        if not query or len(query) < 2:
            return []

        params = {"nom": query, "fields": "nom,code"}

        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(self.REGION_API_URL, params=params)
                response.raise_for_status()
                return response.json()
            except Exception as e:
                print(f"Error fetching regions: {e}")
                return []

    async def search_departments(self, query: str) -> list[dict[str, Any]]:
        """Search for departments by name or code."""
        if not query:
            return []

        params = {"fields": "nom,code,region"}
        if query.isdigit() and len(query) in [2, 3]:
            params["code"] = query
        else:
            params["nom"] = query

        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(self.DEPT_API_URL, params=params)
                response.raise_for_status()
                return response.json()
            except Exception as e:
                print(f"Error fetching departments: {e}")
                return []


location_service = LocationService()
