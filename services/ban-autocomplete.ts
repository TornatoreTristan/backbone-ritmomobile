export type BanSuggestion = {
  label: string;
  name: string;
  postcode: string;
  city: string;
};

export async function searchAddress(
  query: string,
  postalCode?: string,
  signal?: AbortSignal,
): Promise<BanSuggestion[]> {
  if (!query || query.trim().length < 3) return [];

  try {
    const params = new URLSearchParams({
      q: query.trim(),
      limit: '8',
    });
    if (postalCode && postalCode.length === 5) {
      params.set('postcode', postalCode);
    }

    const response = await fetch(
      `https://api-adresse.data.gouv.fr/search/?${params.toString()}`,
      { signal },
    );

    if (!response.ok) return [];

    const data = await response.json();

    if (!Array.isArray(data?.features)) return [];

    return data.features.map(
      (feature: {
        properties: {
          label: string;
          name: string;
          postcode: string;
          city: string;
        };
      }): BanSuggestion => ({
        label: feature.properties.label,
        name: feature.properties.name,
        postcode: feature.properties.postcode,
        city: feature.properties.city,
      }),
    );
  } catch {
    return [];
  }
}
