export interface CollectionFilterValue {
  value: string;
  valueName: string | null;
}

// Data structure from GET /Collection/{id}/GetFiltersForConstants API
export interface ApiFilterOption {
  id: string; // e.g., "color"
  title: string; // e.g., "Renk"
  values: CollectionFilterValue[];
  currency: string | null;
  comparisonType: number;
}

// Structure for filters actively applied by the user
export interface AppliedFilter {
  id: string;
  value: string;
  title: string; // For displaying the active filter
  valueName: string | null; // For displaying the active filter's value
  comparisonType: number;
}

// Product structure for items in "pinnedProducts" (Sabitler)
// and "availableProducts" (Koleksiyon Ürünleri)
export interface CollectionProduct {
  productCode: string;
  colorCode: string | null;
  name: string | null;
  imageUrl: string;
}

// Meta for paginating availableProducts
export interface Meta {
  page: number;
  pageSize: number;
  totalProduct: number;
}

export interface ProductsApiResponse {
  meta: Meta;
  data: CollectionProduct[];
}
