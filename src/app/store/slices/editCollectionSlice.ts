import {
  createSlice,
  createAsyncThunk,
  type PayloadAction,
} from "@reduxjs/toolkit";
import type {
  CollectionProduct,
  Meta,
  ApiFilterOption,
  AppliedFilter,
  ProductsApiResponse,
} from "@/types";

interface CollectionData {
  pinnedProducts: CollectionProduct[];
  initialPinnedProducts: CollectionProduct[];
  appliedFilters: AppliedFilter[];
  initialAppliedFilters: AppliedFilter[];
  hasUnsavedChanges: boolean;
  saveStatus: "idle" | "loading" | "succeeded" | "failed";
  saveError: string | null;
  filterOptions: ApiFilterOption[];
  filterOptionsStatus: "idle" | "loading" | "succeeded" | "failed";
  filterOptionsError: string | null;
  availableProducts: CollectionProduct[];
  availableProductsMeta: Meta | null;
  availableProductsStatus: "idle" | "loading" | "succeeded" | "failed";
  availableProductsError: string | null;
}

interface EditCollectionState {
  currentCollectionId: string | null;
  collections: Record<string, CollectionData>;
}

const createEmptyCollectionData = (): CollectionData => ({
  pinnedProducts: [],
  initialPinnedProducts: [],
  appliedFilters: [],
  initialAppliedFilters: [],
  hasUnsavedChanges: false,
  saveStatus: "idle",
  saveError: null,
  filterOptions: [],
  filterOptionsStatus: "idle",
  filterOptionsError: null,
  availableProducts: [],
  availableProductsMeta: null,
  availableProductsStatus: "idle",
  availableProductsError: null,
});

const initialState: EditCollectionState = {
  currentCollectionId: null,
  collections: {},
};

// --- Async Thunks ---

// Fetches the filter options for a specific collection
export const fetchFilterOptions = createAsyncThunk(
  "editCollection/fetchFilterOptions",
  async (collectionId: string, { rejectWithValue }) => {
    try {
      const response = await fetch(
        `/api/editCollectionProxy/${collectionId}/filters`
      );
      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ error: "Failed to parse error response" }));
        return rejectWithValue(
          errorData.error ||
            `Failed to fetch filter options: ${response.status}`
        );
      }
      const apiResponse: {
        status: number;
        message: string | null;
        data: ApiFilterOption[];
      } = await response.json();
      if (apiResponse.status !== 200 || !apiResponse.data) {
        return rejectWithValue(
          apiResponse.message || "Invalid data structure for filter options"
        );
      }
      return { collectionId, data: apiResponse.data };
    } catch (error: any) {
      return rejectWithValue(
        error.message ||
          "An unknown error occurred while fetching filter options"
      );
    }
  }
);

// Fetches available products based on applied filters and pagination
export const fetchAvailableProducts = createAsyncThunk(
  "editCollection/fetchAvailableProducts",
  async (
    payload: {
      collectionId: string;
      filtersToApply: AppliedFilter[];
      page: number;
      pageSize: number;
    },
    { rejectWithValue }
  ) => {
    const { collectionId, filtersToApply, page, pageSize } = payload;
    try {
      const response = await fetch(
        `/api/editCollectionProxy/${collectionId}/products`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            additionalFilters: filtersToApply.map((f) => ({
              id: f.id,
              value: f.value,
              comparisonType: f.comparisonType,
            })),
            page,
            pageSize,
          }),
        }
      );
      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ error: "Failed to parse error response" }));
        return rejectWithValue(
          errorData.error || `Failed to fetch products: ${response.status}`
        );
      }
      const apiResponse: {
        status: number;
        message: string | null;
        data: ProductsApiResponse;
      } = await response.json();
      if (apiResponse.status !== 200 || !apiResponse.data) {
        return rejectWithValue(
          apiResponse.message || "Invalid data structure for products"
        );
      }
      return { collectionId, data: apiResponse.data };
    } catch (error: any) {
      return rejectWithValue(
        error.message || "An unknown error occurred while fetching products"
      );
    }
  }
);

// Save pinned products to the backend
export const savePinnedProducts = createAsyncThunk(
  "editCollection/savePinnedProducts",
  async (
    payload: {
      collectionId: string;
      pinnedProducts: CollectionProduct[];
    },
    { rejectWithValue }
  ) => {
    const { collectionId, pinnedProducts } = payload;
    try {
      const response = await fetch(
        `/api/editCollectionProxy/${collectionId}/saveConstants`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            constants: pinnedProducts.map((product, index) => ({
              productCode: product.productCode,
              colorCode: product.colorCode,
              position: index + 1,
            })),
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ error: "Failed to parse error response" }));
        return rejectWithValue(
          errorData.error || `Failed to save constants: ${response.status}`
        );
      }

      const apiResponse = await response.json();
      return apiResponse;
    } catch (error: any) {
      return rejectWithValue(
        error.message || "An unknown error occurred while saving constants"
      );
    }
  }
);

const editCollectionSlice = createSlice({
  name: "editCollection",
  initialState,
  reducers: {
    setEditingCollectionId: (state, action: PayloadAction<string>) => {
      const collectionId = action.payload;
      state.currentCollectionId = collectionId;

      // Initialize collection data if it doesn't exist
      if (!state.collections[collectionId]) {
        state.collections[collectionId] = createEmptyCollectionData();
      }
    },

    addPinnedProduct: (
      state,
      action: PayloadAction<{
        collectionId: string;
        product: CollectionProduct;
      }>
    ) => {
      const { collectionId, product } = action.payload;
      if (!state.collections[collectionId]) {
        state.collections[collectionId] = createEmptyCollectionData();
      }

      const collection = state.collections[collectionId];
      const exists = collection.pinnedProducts.some(
        (p) =>
          p.productCode === product.productCode &&
          p.colorCode === product.colorCode
      );
      if (!exists) {
        collection.pinnedProducts.push(product);
        collection.hasUnsavedChanges = true;
      }
    },

    removePinnedProduct: (
      state,
      action: PayloadAction<{
        collectionId: string;
        productCode: string;
        colorCode?: string | null;
      }>
    ) => {
      const { collectionId, productCode, colorCode } = action.payload;
      if (!state.collections[collectionId]) return;

      const collection = state.collections[collectionId];
      collection.pinnedProducts = collection.pinnedProducts.filter(
        (p) => !(p.productCode === productCode && p.colorCode === colorCode)
      );
      collection.hasUnsavedChanges = true;
    },

    reorderPinnedProducts: (
      state,
      action: PayloadAction<{
        collectionId: string;
        products: CollectionProduct[];
      }>
    ) => {
      const { collectionId, products } = action.payload;
      if (!state.collections[collectionId]) return;

      const collection = state.collections[collectionId];
      collection.pinnedProducts = products;
      collection.hasUnsavedChanges = true;
    },

    updateAppliedFilters: (
      state,
      action: PayloadAction<{ collectionId: string; filters: AppliedFilter[] }>
    ) => {
      const { collectionId, filters } = action.payload;
      if (!state.collections[collectionId]) {
        state.collections[collectionId] = createEmptyCollectionData();
      }

      const collection = state.collections[collectionId];
      collection.appliedFilters = filters;
      collection.availableProductsStatus = "idle";
      collection.availableProductsError = null;
    },

    clearAllAppliedFilters: (state, action: PayloadAction<string>) => {
      const collectionId = action.payload;
      if (!state.collections[collectionId]) return;

      const collection = state.collections[collectionId];
      collection.appliedFilters = [];
      collection.availableProductsStatus = "idle";
      collection.availableProductsError = null;
    },

    markChangesSaved: (state, action: PayloadAction<string>) => {
      const collectionId = action.payload;
      if (!state.collections[collectionId]) return;

      const collection = state.collections[collectionId];
      collection.hasUnsavedChanges = false;
      collection.initialPinnedProducts = [...collection.pinnedProducts];
      collection.initialAppliedFilters = [...collection.appliedFilters];
    },

    discardChanges: (state, action: PayloadAction<string>) => {
      const collectionId = action.payload;
      if (!state.collections[collectionId]) return;

      const collection = state.collections[collectionId];
      collection.pinnedProducts = [...collection.initialPinnedProducts];
      collection.appliedFilters = [...collection.initialAppliedFilters];
      collection.hasUnsavedChanges = false;
    },

    setInitialState: (
      state,
      action: PayloadAction<{
        collectionId: string;
        pinnedProducts: CollectionProduct[];
        appliedFilters: AppliedFilter[];
      }>
    ) => {
      const { collectionId, pinnedProducts, appliedFilters } = action.payload;
      if (!state.collections[collectionId]) {
        state.collections[collectionId] = createEmptyCollectionData();
      }

      const collection = state.collections[collectionId];
      collection.pinnedProducts = [...pinnedProducts];
      collection.initialPinnedProducts = [...pinnedProducts];
      collection.appliedFilters = [...appliedFilters];
      collection.initialAppliedFilters = [...appliedFilters];
      collection.hasUnsavedChanges = false;
    },

    resetEditCollection: () => initialState,

    removeCollection: (state, action: PayloadAction<string>) => {
      const collectionId = action.payload;
      delete state.collections[collectionId];
      if (state.currentCollectionId === collectionId) {
        state.currentCollectionId = null;
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchFilterOptions.pending, (state, action) => {
        const collectionId = action.meta.arg;
        if (!state.collections[collectionId]) {
          state.collections[collectionId] = createEmptyCollectionData();
        }
        state.collections[collectionId].filterOptionsStatus = "loading";
        state.collections[collectionId].filterOptionsError = null;
      })
      .addCase(fetchFilterOptions.fulfilled, (state, action) => {
        const { collectionId, data } = action.payload;
        if (!state.collections[collectionId]) {
          state.collections[collectionId] = createEmptyCollectionData();
        }
        state.collections[collectionId].filterOptionsStatus = "succeeded";
        state.collections[collectionId].filterOptions = data;
      })
      .addCase(fetchFilterOptions.rejected, (state, action) => {
        const collectionId = action.meta.arg;
        if (!state.collections[collectionId]) {
          state.collections[collectionId] = createEmptyCollectionData();
        }
        state.collections[collectionId].filterOptionsStatus = "failed";
        state.collections[collectionId].filterOptionsError =
          action.payload as string;
      })
      .addCase(fetchAvailableProducts.pending, (state, action) => {
        const collectionId = action.meta.arg.collectionId;
        if (!state.collections[collectionId]) {
          state.collections[collectionId] = createEmptyCollectionData();
        }
        state.collections[collectionId].availableProductsStatus = "loading";
        state.collections[collectionId].availableProductsError = null;
      })
      .addCase(fetchAvailableProducts.fulfilled, (state, action) => {
        const { collectionId, data } = action.payload;
        if (!state.collections[collectionId]) {
          state.collections[collectionId] = createEmptyCollectionData();
        }
        state.collections[collectionId].availableProductsStatus = "succeeded";
        state.collections[collectionId].availableProducts = data.data;
        state.collections[collectionId].availableProductsMeta = data.meta;
      })
      .addCase(fetchAvailableProducts.rejected, (state, action) => {
        const collectionId = action.meta.arg.collectionId;
        if (!state.collections[collectionId]) {
          state.collections[collectionId] = createEmptyCollectionData();
        }
        state.collections[collectionId].availableProductsStatus = "failed";
        state.collections[collectionId].availableProductsError =
          action.payload as string;
      });
  },
});

export const {
  setEditingCollectionId,
  addPinnedProduct,
  removePinnedProduct,
  reorderPinnedProducts,
  updateAppliedFilters,
  clearAllAppliedFilters,
  resetEditCollection,
  markChangesSaved,
  discardChanges,
  setInitialState,
  removeCollection,
} = editCollectionSlice.actions;

// Updated selectors that take collectionId as parameter
export const selectCollectionData = (
  state: { editCollection: EditCollectionState },
  collectionId: string
) =>
  state.editCollection.collections[collectionId] || createEmptyCollectionData();

export const selectCurrentCollectionId = (state: {
  editCollection: EditCollectionState;
}) => state.editCollection.currentCollectionId;

export const selectPinnedProducts = (
  state: { editCollection: EditCollectionState },
  collectionId: string
) => state.editCollection.collections[collectionId]?.pinnedProducts || [];

export const selectAvailableProducts = (
  state: { editCollection: EditCollectionState },
  collectionId: string
) => state.editCollection.collections[collectionId]?.availableProducts || [];

export const selectHasUnsavedChanges = (
  state: { editCollection: EditCollectionState },
  collectionId: string
) => state.editCollection.collections[collectionId]?.hasUnsavedChanges || false;

export const selectFilterOptions = (
  state: { editCollection: EditCollectionState },
  collectionId: string
) => state.editCollection.collections[collectionId]?.filterOptions || [];

export const selectAppliedFilters = (
  state: { editCollection: EditCollectionState },
  collectionId: string
) => state.editCollection.collections[collectionId]?.appliedFilters || [];

export const selectAvailableProductsMeta = (
  state: { editCollection: EditCollectionState },
  collectionId: string
) =>
  state.editCollection.collections[collectionId]?.availableProductsMeta || null;

export const selectFilterOptionsStatus = (
  state: { editCollection: EditCollectionState },
  collectionId: string
) =>
  state.editCollection.collections[collectionId]?.filterOptionsStatus || "idle";

export const selectAvailableProductsStatus = (
  state: { editCollection: EditCollectionState },
  collectionId: string
) =>
  state.editCollection.collections[collectionId]?.availableProductsStatus ||
  "idle";

export const selectFilterOptionsError = (
  state: { editCollection: EditCollectionState },
  collectionId: string
) => state.editCollection.collections[collectionId]?.filterOptionsError || null;

export const selectAvailableProductsError = (
  state: { editCollection: EditCollectionState },
  collectionId: string
) =>
  state.editCollection.collections[collectionId]?.availableProductsError ||
  null;

export const selectSaveStatus = (
  state: { editCollection: EditCollectionState },
  collectionId: string
) => state.editCollection.collections[collectionId]?.saveStatus || "idle";

export const selectSaveError = (
  state: { editCollection: EditCollectionState },
  collectionId: string
) => state.editCollection.collections[collectionId]?.saveError || null;

// Selector to check if any collection has unsaved changes
export const selectHasAnyUnsavedChanges = (state: {
  editCollection: EditCollectionState;
}) =>
  Object.values(state.editCollection.collections).some(
    (collection) => collection.hasUnsavedChanges
  );

export default editCollectionSlice.reducer;
