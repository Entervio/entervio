from typing import Any

import httpx


class LocationService:
    GEO_API_URL = "https://geo.api.gouv.fr/communes"

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


location_service = LocationService()
