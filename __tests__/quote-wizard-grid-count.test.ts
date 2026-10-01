import { countGridDiagnostics, type SuggestedProduct } from '@/services/quote-wizard';

function makeSuggestion(
  id: string,
  pricingSource: 'grid' | 'fixed',
  result: 'obligatoire' | 'facultatif' = 'obligatoire',
): SuggestedProduct {
  return {
    product: { id, nameI18n: { fr: id } },
    result,
    priceHt: 100,
    priceTtc: 120,
    pricingSource,
  };
}

describe('countGridDiagnostics', () => {
  it('returns 0 without suggestions or selection', () => {
    expect(countGridDiagnostics([], [])).toBe(0);
    expect(countGridDiagnostics([makeSuggestion('a', 'grid')], [])).toBe(0);
  });

  // Le bug d'origine : l'étape 6 envoyait `suggestions.obligatoire.length`, donc
  // les produits obligatoires à prix fixe (ERP, prélèvement…) faisaient basculer
  // la grille sur un palier supérieur — prix affiché ≠ prix de la grille.
  it('ignores fixed-priced products, even obligatoire ones', () => {
    const suggestions = [
      makeSuggestion('dpe', 'grid'),
      makeSuggestion('amiante', 'grid'),
      makeSuggestion('erp', 'fixed'),
    ];
    expect(countGridDiagnostics(suggestions, ['dpe', 'amiante', 'erp'])).toBe(2);
  });

  it('counts selected facultatif grid products too', () => {
    const suggestions = [
      makeSuggestion('dpe', 'grid'),
      makeSuggestion('gaz', 'grid', 'facultatif'),
    ];
    expect(countGridDiagnostics(suggestions, ['dpe', 'gaz'])).toBe(2);
  });

  it('ignores unselected grid products', () => {
    const suggestions = [
      makeSuggestion('dpe', 'grid'),
      makeSuggestion('gaz', 'grid', 'facultatif'),
    ];
    expect(countGridDiagnostics(suggestions, ['dpe'])).toBe(1);
  });

  it('returns 0 when only fixed-priced products are selected', () => {
    const suggestions = [makeSuggestion('erp', 'fixed'), makeSuggestion('dpe', 'grid')];
    expect(countGridDiagnostics(suggestions, ['erp'])).toBe(0);
  });

  // Quand la recherche en grille échoue (zone absente, tranche de surface non
  // couverte), le serveur renvoie pricingSource 'fixed' avec product.priceTtc,
  // qui vaut toujours null → 0 € pour un produit grille. Sans se fier à
  // `pricingType`, ce diagnostic sortirait du palier et le client tarifierait un
  // ensemble différent de celui que le serveur retarife à la soumission.
  it('still counts a grid product downgraded to fixed by a failed grid lookup', () => {
    const downgraded: SuggestedProduct = {
      product: { id: 'dpe', nameI18n: { fr: 'DPE' }, pricingType: 'grid' },
      result: 'obligatoire',
      priceHt: 0,
      priceTtc: 0,
      pricingSource: 'fixed',
    };
    const genuinelyFixed: SuggestedProduct = {
      product: { id: 'erp', nameI18n: { fr: 'ERP' }, pricingType: 'fixed' },
      result: 'obligatoire',
      priceHt: 40,
      priceTtc: 48,
      pricingSource: 'fixed',
    };
    expect(countGridDiagnostics([downgraded, genuinelyFixed], ['dpe', 'erp'])).toBe(1);
  });

  it('falls back to pricingSource when pricingType is absent', () => {
    const suggestions = [makeSuggestion('dpe', 'grid'), makeSuggestion('erp', 'fixed')];
    expect(countGridDiagnostics(suggestions, ['dpe', 'erp'])).toBe(1);
  });
});
