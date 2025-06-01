"use client";

import type React from "react";
import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useDispatch, useSelector } from "react-redux";
import {
  DndContext,
  type DragEndEvent,
  type DragStartEvent,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  CircularProgress,
  IconButton,
  Button,
  Dialog,
  DialogContent,
  DialogActions,
  Typography,
  Pagination,
  Chip,
} from "@mui/material";
import {
  FilterIcon,
  Trash2,
  CheckCircle,
  AlertTriangle,
  Info,
  Grid3X3,
  Plus,
  X,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import type { RootState, AppDispatch } from "@/app/store/store";
import {
  setEditingCollectionId,
  fetchFilterOptions,
  fetchAvailableProducts,
  addPinnedProduct,
  removePinnedProduct,
  reorderPinnedProducts,
  updateAppliedFilters,
  clearAllAppliedFilters,
  discardChanges,
  markChangesSaved,
} from "@/app/store/slices/editCollectionSlice";
import type { CollectionProduct, AppliedFilter } from "@/types";
import { FilterModal } from "@/components/modals/filterModal";
import {
  selectPinnedProducts,
  selectFilterOptions,
  selectAppliedFilters,
  selectAvailableProducts,
  selectAvailableProductsMeta,
  selectFilterOptionsStatus,
  selectAvailableProductsStatus,
  selectFilterOptionsError,
  selectAvailableProductsError,
  selectHasUnsavedChanges,
  selectSaveStatus,
  selectSaveError,
} from "@/app/store/slices/editCollectionSlice";

type LayoutMode = "2x2" | "3x2" | "4x4";

// Hook to detect container width
function useContainerWidth() {
  const [width, setWidth] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updateWidth = () => {
      if (ref.current) {
        setWidth(ref.current.offsetWidth);
      }
    };

    updateWidth();
    window.addEventListener("resize", updateWidth);
    return () => window.removeEventListener("resize", updateWidth);
  }, []);

  return { ref, width };
}

// Fixed layout configuration - never changes columns automatically
function getLayoutConfig(layoutMode: LayoutMode) {
  const configs = {
    "2x2": { cols: 2, rows: 2, total: 4 },
    "3x2": { cols: 3, rows: 2, total: 6 },
    "4x4": { cols: 4, rows: 4, total: 16 },
  };
  return configs[layoutMode];
}

// Get responsive classes based on container width and layout mode
function getResponsiveClasses(containerWidth: number, layoutMode: LayoutMode) {
  const isVeryNarrow = containerWidth < 400;
  const isNarrow = containerWidth < 600;
  const isMedium = containerWidth < 800;

  // More aggressive scaling for 4x4 layout
  if (layoutMode === "4x4") {
    if (isVeryNarrow) {
      return {
        gap: "gap-0.5",
        text: "text-[10px]",
        padding: "p-0.5",
        iconSize: "h-2 w-2",
        buttonPadding: "p-0.5",
      };
    } else if (isNarrow) {
      return {
        gap: "gap-1",
        text: "text-[11px]",
        padding: "p-1",
        iconSize: "h-2.5 w-2.5",
        buttonPadding: "p-0.5",
      };
    } else if (isMedium) {
      return {
        gap: "gap-1",
        text: "text-xs",
        padding: "p-1",
        iconSize: "h-3 w-3",
        buttonPadding: "p-1",
      };
    }
  }

  // Scaling for 3x2 layout
  if (layoutMode === "3x2") {
    if (isVeryNarrow) {
      return {
        gap: "gap-1",
        text: "text-[11px]",
        padding: "p-1",
        iconSize: "h-2.5 w-2.5",
        buttonPadding: "p-1",
      };
    } else if (isNarrow) {
      return {
        gap: "gap-1.5",
        text: "text-xs",
        padding: "p-1",
        iconSize: "h-3 w-3",
        buttonPadding: "p-1",
      };
    }
  }

  // Default scaling for 2x2 and larger screens
  if (isVeryNarrow) {
    return {
      gap: "gap-2",
      text: "text-xs",
      padding: "p-1",
      iconSize: "h-3 w-3",
      buttonPadding: "p-1",
    };
  } else if (isNarrow) {
    return {
      gap: "gap-2",
      text: "text-xs",
      padding: "p-1.5",
      iconSize: "h-3.5 w-3.5",
      buttonPadding: "p-1.5",
    };
  }

  // Default for larger screens
  return {
    gap: "gap-3",
    text: "text-sm",
    padding: "p-2",
    iconSize: "h-4 w-4",
    buttonPadding: "p-2",
  };
}

// Non-draggable Product Card Component for Collection Products
interface ProductCardProps {
  product: CollectionProduct;
  onAdd?: () => void;
  isAdded?: boolean;
}

function ProductCard({ product, onAdd, isAdded = false }: ProductCardProps) {
  const { t } = useTranslation();
  const displayName = product.name
    ? product.name.split(" ").pop() || product.name
    : t("editCollectionPage.product", "Ürün");

  return (
    <div className="relative bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 transition-all duration-200 hover:shadow-sm hover:border-gray-300 dark:hover:border-gray-600 min-w-0">
      <div className="aspect-[3/4] relative overflow-hidden rounded-t">
        <img
          src={product.imageUrl || "/placeholder.svg?height=200&width=150"}
          alt={displayName}
          className="w-full h-full object-cover"
        />
        {isAdded && (
          <div className="absolute inset-0 backdrop-blur-[2px] flex items-center justify-center">
            <div className="bg-white bg-opacity-90 text-gray-800 text-xs font-medium px-2 py-1 rounded-full shadow-sm">
              {t("editCollectionPage.added", "Eklendi")}
            </div>
          </div>
        )}
        {!isAdded && onAdd && (
          <button
            onClick={onAdd}
            className="absolute top-1 right-1 bg-white dark:bg-gray-800 bg-opacity-90 dark:bg-opacity-90 hover:bg-blue-50 dark:hover:bg-blue-900 hover:text-blue-600 dark:hover:text-blue-400 rounded-full p-1 shadow-sm transition-colors"
          >
            <Plus className="cursor-pointer h-3 w-3 text-gray-700 dark:text-gray-300" />
          </button>
        )}
      </div>
      <div className="p-1.5 min-h-0">
        <Typography
          variant="caption"
          className="font-medium text-gray-900 dark:text-gray-100 block truncate text-xs leading-tight"
        >
          {displayName}
        </Typography>
        <Typography
          variant="caption"
          className="text-gray-500 dark:text-gray-400 block text-xs truncate leading-tight"
          title={product.productCode}
        >
          {product.productCode}
        </Typography>
      </div>
    </div>
  );
}

// Draggable Product Card Component for Constants
interface DraggableConstantCardProps {
  product: CollectionProduct;
  isDragging?: boolean;
  onRemove?: () => void;
  position?: number;
  containerWidth?: number;
  layoutMode?: LayoutMode;
  isOver?: boolean; // Add this prop for drop zone feedback
}

function DraggableConstantCard({
  product,
  isDragging = false,
  onRemove,
  position,
  containerWidth = 0,
  layoutMode = "4x4",
  isOver = false,
}: DraggableConstantCardProps) {
  const { t } = useTranslation();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
    isOver: isSortableOver,
  } = useSortable({
    id: `${product.productCode}-${product.colorCode || ""}`,
  });

  const displayName = product.name
    ? product.name.split(" ").pop() || product.name
    : t("editCollectionPage.product", "Ürün");

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: isDragging ? "none" : transition, // Disable transition during drag
    opacity: isDragging || isSortableDragging ? 0.3 : 1,
    zIndex: isDragging || isSortableDragging ? 1000 : 1,
  };

  const classes = getResponsiveClasses(containerWidth, layoutMode);

  // Enhanced styling for drag states
  const getDragClasses = () => {
    if (isDragging || isSortableDragging) {
      return "shadow-2xl border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20 scale-105";
    }
    if (isOver || isSortableOver) {
      return "border-blue-300 dark:border-blue-600 bg-blue-50/50 dark:bg-blue-900/10 shadow-lg";
    }
    return "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600";
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`relative cursor-grab active:cursor-grabbing bg-white dark:bg-gray-800 rounded border-2 transition-all duration-200 hover:shadow-sm min-w-0 min-h-0 ${getDragClasses()}`}
    >
      {/* Drop zone indicator */}
      {(isOver || isSortableOver) && (
        <div className="absolute inset-0 border-2 border-dashed border-blue-400 dark:border-blue-500 rounded bg-blue-100/20 dark:bg-blue-900/20 pointer-events-none z-10">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="bg-blue-500 dark:bg-blue-400 text-white text-xs px-2 py-1 rounded-full shadow-lg">
              {t("editCollectionPage.dropHere", "Drop here")}
            </div>
          </div>
        </div>
      )}

      <div className="aspect-[3/4] relative overflow-hidden rounded-t">
        <img
          src={product.imageUrl || "/placeholder.svg?height=120&width=90"}
          alt={displayName}
          className="w-full h-full object-cover"
          draggable={false}
        />
        {onRemove && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            className={`absolute top-1 right-1 bg-white dark:bg-gray-800 bg-opacity-90 dark:bg-opacity-90 hover:bg-red-50 dark:hover:bg-red-900 hover:text-red-600 dark:hover:text-red-400 rounded-full ${classes.buttonPadding} shadow-sm transition-colors z-20`}
          >
            <Trash2
              className={`${classes.iconSize} text-gray-700 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400`}
            />
          </button>
        )}
      </div>
      <div className={`${classes.padding} min-h-0`}>
        <Typography
          variant="caption"
          className={`font-medium text-gray-900 dark:text-gray-100 block truncate ${classes.text} leading-tight`}
        >
          {displayName}
        </Typography>
        <Typography
          variant="caption"
          className={`text-gray-500 dark:text-gray-400 block truncate ${classes.text} leading-tight`}
          title={`Position ${position}`}
        >
          {position
            ? `${t("editCollectionPage.position", "Pozisyon")}: ${position}`
            : product.productCode}
        </Typography>
      </div>
    </div>
  );
}

// Placeholder Card Component
interface PlaceholderCardProps {
  containerWidth?: number;
  layoutMode?: LayoutMode;
  isDropTarget?: boolean;
}

function PlaceholderCard({
  containerWidth = 0,
  layoutMode = "4x4",
  isDropTarget = false,
}: PlaceholderCardProps) {
  const { t } = useTranslation();
  const classes = getResponsiveClasses(containerWidth, layoutMode);

  return (
    <div
      className={`relative bg-gray-50 dark:bg-gray-800 rounded border-2 border-dashed min-w-0 min-h-0 transition-all duration-200 ${
        isDropTarget
          ? "border-blue-400 dark:border-blue-500 bg-blue-50 dark:bg-blue-900/20"
          : "border-gray-300 dark:border-gray-700"
      }`}
    >
      <div className="aspect-[3/4] flex items-center justify-center">
        <div className="text-center">
          <div
            className={`w-4 h-4 sm:w-6 sm:h-6 mx-auto mb-1 rounded flex items-center justify-center ${
              isDropTarget
                ? "bg-blue-200 dark:bg-blue-800"
                : "bg-gray-200 dark:bg-gray-700"
            }`}
          >
            <svg
              className={`w-2 h-2 sm:w-3 sm:h-3 ${
                isDropTarget
                  ? "text-blue-500 dark:text-blue-400"
                  : "text-gray-400 dark:text-gray-500"
              }`}
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <Typography
            variant="caption"
            className={`${classes.text} leading-tight ${
              isDropTarget
                ? "text-blue-500 dark:text-blue-400"
                : "text-gray-400 dark:text-gray-500"
            }`}
          >
            {isDropTarget
              ? t("editCollectionPage.dropZone", "Drop Zone")
              : t("editCollectionPage.placeholder", "Placeholder")}
          </Typography>
        </div>
      </div>
      <div className={classes.padding}>
        <div
          className={`h-2 sm:h-3 rounded mb-1 ${
            isDropTarget
              ? "bg-blue-200 dark:bg-blue-700"
              : "bg-gray-200 dark:bg-gray-700"
          }`}
        ></div>
        <div
          className={`h-1.5 sm:h-2 rounded w-3/4 ${
            isDropTarget
              ? "bg-blue-100 dark:bg-blue-600"
              : "bg-gray-100 dark:bg-gray-600"
          }`}
        ></div>
      </div>
    </div>
  );
}

// Confirmation Modal Component
interface ConfirmationModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  type?: "warning" | "error" | "success";
}

function ConfirmationModal({
  open,
  onClose,
  onConfirm,
  title,
  message,
  type = "warning",
}: ConfirmationModalProps) {
  const { t } = useTranslation();

  const getIcon = () => {
    switch (type) {
      case "error":
        return <AlertTriangle className="h-8 w-8 text-red-500" />;
      case "success":
        return <CheckCircle className="h-8 w-8 text-green-500" />;
      default:
        return <AlertTriangle className="h-8 w-8 text-amber-500" />;
    }
  };

  const getColors = () => {
    switch (type) {
      case "error":
        return {
          iconBg: "bg-red-100 dark:bg-red-900/30",
          confirmBtn:
            "bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800",
          cancelBtn:
            "border-red-300 text-red-700 hover:bg-red-50 dark:border-red-600 dark:text-red-400 dark:hover:bg-red-900/20",
        };
      case "success":
        return {
          iconBg: "bg-green-100 dark:bg-green-900/30",
          confirmBtn:
            "bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-800",
          cancelBtn:
            "border-green-300 text-green-700 hover:bg-green-50 dark:border-green-600 dark:text-green-400 dark:hover:bg-green-900/20",
        };
      default:
        return {
          iconBg: "bg-amber-100 dark:bg-amber-900/30",
          confirmBtn:
            "bg-amber-600 hover:bg-amber-700 dark:bg-amber-700 dark:hover:bg-amber-800",
          cancelBtn:
            "border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-600 dark:text-amber-400 dark:hover:bg-amber-900/20",
        };
    }
  };

  const colors = getColors();

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        className:
          "bg-white dark:bg-gray-800 rounded-lg shadow-2xl border-0 overflow-hidden",
        style: { margin: 16 },
      }}
    >
      <div className="relative">
        {/* Close button */}
        <IconButton
          onClick={onClose}
          className="absolute top-3 right-3 z-10 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
          size="small"
        >
          <X className="h-4 w-4" />
        </IconButton>

        <DialogContent className="flex flex-col items-center justify-center text-center py-6 px-6">
          {/* Icon container */}
          <div
            className={`w-16 h-16 mb-4 rounded-full ${colors.iconBg} flex items-center justify-center`}
          >
            {getIcon()}
          </div>

          {/* Title */}
          <Typography
            variant="h6"
            className="font-semibold mb-2 text-gray-900 dark:text-gray-100 text-lg"
          >
            {title}
          </Typography>

          {/* Message */}
          <Typography
            variant="body2"
            className="text-gray-600 dark:text-gray-300 leading-relaxed max-w-sm mx-auto text-sm"
          >
            {message}
          </Typography>
        </DialogContent>

        <DialogActions className="px-6 pb-6 pt-0 flex justify-center gap-3">
          {type !== "success" && (
            <>
              <Button
                onClick={onClose}
                variant="outlined"
                size="medium"
                className={`${colors.cancelBtn} min-w-[100px] py-2 px-4 rounded-lg font-medium border-2 text-sm`}
              >
                {t("common.cancel")}
              </Button>
              <Button
                onClick={onConfirm}
                variant="contained"
                size="medium"
                className={`${colors.confirmBtn} text-white min-w-[100px] py-2 px-4 rounded-lg font-medium shadow-lg text-sm`}
              >
                {t("common.confirm")}
              </Button>
            </>
          )}
          {type === "success" && (
            <Button
              onClick={onClose}
              variant="contained"
              size="medium"
              className={`${colors.confirmBtn} text-white min-w-[100px] py-2 px-4 rounded-lg font-medium shadow-lg text-sm`}
            >
              {t("common.close")}
            </Button>
          )}
        </DialogActions>
      </div>
    </Dialog>
  );
}

export default function EditCollectionConstants() {
  const params = useParams();
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const { data: session } = useSession({ required: true });
  const { t } = useTranslation();

  const collectionId = params.collectionId as string;

  // Container width detection for responsive layout
  const { ref: containerRef, width: containerWidth } = useContainerWidth();

  // Redux state
  const pinnedProducts = useSelector((state: RootState) =>
    selectPinnedProducts(state, collectionId)
  );
  const filterOptions = useSelector((state: RootState) =>
    selectFilterOptions(state, collectionId)
  );
  const appliedFilters = useSelector((state: RootState) =>
    selectAppliedFilters(state, collectionId)
  );
  const availableProducts = useSelector((state: RootState) =>
    selectAvailableProducts(state, collectionId)
  );
  const availableProductsMeta = useSelector((state: RootState) =>
    selectAvailableProductsMeta(state, collectionId)
  );
  const filterOptionsStatus = useSelector((state: RootState) =>
    selectFilterOptionsStatus(state, collectionId)
  );
  const availableProductsStatus = useSelector((state: RootState) =>
    selectAvailableProductsStatus(state, collectionId)
  );
  const filterOptionsError = useSelector((state: RootState) =>
    selectFilterOptionsError(state, collectionId)
  );
  const availableProductsError = useSelector((state: RootState) =>
    selectAvailableProductsError(state, collectionId)
  );
  const hasUnsavedChanges = useSelector((state: RootState) =>
    selectHasUnsavedChanges(state, collectionId)
  );
  const saveStatus = useSelector((state: RootState) =>
    selectSaveStatus(state, collectionId)
  );
  const saveError = useSelector((state: RootState) =>
    selectSaveError(state, collectionId)
  );

  // Local state
  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [successModalOpen, setSuccessModalOpen] = useState(false);
  const [saveConfirmModalOpen, setSaveConfirmModalOpen] = useState(false);
  const [errorModalOpen, setErrorModalOpen] = useState(false);
  const [productToRemove, setProductToRemove] =
    useState<CollectionProduct | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [constantsPage, setConstantsPage] = useState(1);
  const [layoutMode, setLayoutMode] = useState<LayoutMode>("4x4");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [draggedProduct, setDraggedProduct] =
    useState<CollectionProduct | null>(null);
  const [mobileTab, setMobileTab] = useState<"products" | "constants">(
    "products"
  );
  const [unsavedChangesModalOpen, setUnsavedChangesModalOpen] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(
    null
  );
  // Add this state for tracking drag over zones
  const [dragOverZone, setDragOverZone] = useState<string | null>(null);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Fixed layout configuration - never changes automatically
  const currentLayout = getLayoutConfig(layoutMode);
  const totalPages = 4;
  const startIndex = (constantsPage - 1) * currentLayout.total;
  const endIndex = startIndex + currentLayout.total;
  const currentPageProducts = pinnedProducts.slice(startIndex, endIndex);
  const placeholdersNeeded = Math.max(
    0,
    currentLayout.total - currentPageProducts.length
  );

  // Get responsive classes for the grid
  const responsiveClasses = getResponsiveClasses(containerWidth, layoutMode);

  // Initialize collection editing
  useEffect(() => {
    if (collectionId) {
      dispatch(setEditingCollectionId(collectionId));
      dispatch(fetchFilterOptions(collectionId));
    }
  }, [collectionId, dispatch]);

  // Fetch products when filters change
  useEffect(() => {
    if (collectionId && filterOptionsStatus === "succeeded") {
      dispatch(
        fetchAvailableProducts({
          collectionId,
          filtersToApply: appliedFilters,
          page: currentPage,
          pageSize: 36,
        })
      );
    }
  }, [
    collectionId,
    appliedFilters,
    currentPage,
    filterOptionsStatus,
    dispatch,
  ]);

  // Update the handleDragStart function:
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    setActiveId(active.id as string);

    const productId = active.id as string;
    const product = currentPageProducts.find(
      (p) => `${p.productCode}-${p.colorCode || ""}` === productId
    );

    setDraggedProduct(product || null);
  };

  // Update the handleDragEnd function:
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    setDraggedProduct(null);
    setDragOverZone(null);

    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    // Only handle reordering within constants
    if (
      currentPageProducts.some(
        (p) => `${p.productCode}-${p.colorCode || ""}` === activeId
      )
    ) {
      const oldIndex = currentPageProducts.findIndex(
        (p) => `${p.productCode}-${p.colorCode || ""}` === activeId
      );
      const newIndex = currentPageProducts.findIndex(
        (p) => `${p.productCode}-${p.colorCode || ""}` === overId
      );

      if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
        // Calculate global indices
        const globalOldIndex = startIndex + oldIndex;
        const globalNewIndex = startIndex + newIndex;
        const newOrder = arrayMove(
          pinnedProducts,
          globalOldIndex,
          globalNewIndex
        );
        dispatch(reorderPinnedProducts({ collectionId, products: newOrder }));
      }
    }
  };

  // Add handleDragOver function:
  const handleDragOver = (event: any) => {
    const { over } = event;
    setDragOverZone(over?.id || null);
  };

  // Handle filter application
  const handleApplyFilters = useCallback(
    (filters: AppliedFilter[]) => {
      dispatch(updateAppliedFilters({ collectionId, filters }));
      setCurrentPage(1);
    },
    [dispatch, collectionId]
  );

  // Handle clear filters
  const handleClearFilters = useCallback(() => {
    dispatch(clearAllAppliedFilters(collectionId));
    setCurrentPage(1);
  }, [dispatch, collectionId]);

  // Handle add product to constants
  const handleAddToConstants = (product: CollectionProduct) => {
    const isAlreadyPinned = pinnedProducts.some(
      (p) =>
        p.productCode === product.productCode &&
        p.colorCode === product.colorCode
    );

    if (!isAlreadyPinned) {
      dispatch(addPinnedProduct({ collectionId, product }));
    }
  };

  // Handle remove product from pinned
  const handleRemoveFromPinned = (product: CollectionProduct) => {
    setProductToRemove(product);
    setConfirmModalOpen(true);
  };

  const confirmRemoveFromPinned = () => {
    if (productToRemove) {
      try {
        dispatch(
          removePinnedProduct({
            collectionId,
            productCode: productToRemove.productCode,
            colorCode: productToRemove.colorCode,
          })
        );
        setConfirmModalOpen(false);
        setProductToRemove(null);
        setSuccessModalOpen(true);
      } catch (error) {
        setConfirmModalOpen(false);
        setErrorModalOpen(true);
      }
    }
  };

  // Handle save
  const handleSave = () => {
    setSaveConfirmModalOpen(true);
  };

  // Update the confirmSave function to show the RequestModal instead of making an API call
  const confirmSave = () => {
    setSaveConfirmModalOpen(false);
    // Mark changes as saved in Redux
    dispatch(markChangesSaved(collectionId));
    // Show success modal
    setSuccessModalOpen(true);
  };

  // Add function to handle navigation with unsaved changes check
  const handleNavigationAttempt = (path: string) => {
    if (hasUnsavedChanges) {
      setPendingNavigation(path);
      setUnsavedChangesModalOpen(true);
    } else {
      router.push(path);
    }
  };

  // Add function to confirm navigation and discard changes
  const confirmNavigationAndDiscard = () => {
    if (pendingNavigation) {
      dispatch(discardChanges(collectionId)); // Reset all changes for this collection
      router.push(pendingNavigation);
    }
    setUnsavedChangesModalOpen(false);
    setPendingNavigation(null);
  };

  // Add function to cancel navigation
  const cancelNavigation = () => {
    setUnsavedChangesModalOpen(false);
    setPendingNavigation(null);
  };

  // Update the handleCancel function to check for unsaved changes
  const handleCancel = () => {
    handleNavigationAttempt("/collections");
  };

  // Handle page change
  const handlePageChange = (
    event: React.ChangeEvent<unknown>,
    value: number
  ) => {
    setCurrentPage(value);
  };

  // Handle constants page change
  const handleConstantsPageChange = (
    event: React.ChangeEvent<unknown>,
    value: number
  ) => {
    setConstantsPage(value);
  };

  // Check if product is already added
  const isProductAdded = (product: CollectionProduct) => {
    return pinnedProducts.some(
      (p) =>
        p.productCode === product.productCode &&
        p.colorCode === product.colorCode
    );
  };

  // Add effect to handle browser navigation (back button, refresh, etc.)
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = t(
          "editCollectionPage.unsavedChangesWarning",
          "You have unsaved changes. Are you sure you want to leave?"
        );
        return e.returnValue;
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges, t]);

  useEffect(() => {
    const handleNavigationAttempt = (event: CustomEvent) => {
      const { href } = event.detail;
      if (hasUnsavedChanges) {
        setPendingNavigation(href);
        setUnsavedChangesModalOpen(true);
      } else {
        router.push(href);
      }
    };

    window.addEventListener(
      "navigation-attempt",
      handleNavigationAttempt as EventListener
    );

    return () => {
      window.removeEventListener(
        "navigation-attempt",
        handleNavigationAttempt as EventListener
      );
    };
  }, [hasUnsavedChanges, router]);

  if (filterOptionsStatus === "loading") {
    return (
      <div className="flex justify-center items-center h-64">
        <CircularProgress
          size={24}
          className="text-blue-500 dark:text-blue-400"
        />
      </div>
    );
  }

  if (filterOptionsError) {
    return (
      <div className="bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-800 text-red-700 dark:text-red-400 px-3 py-2 rounded text-sm">
        <strong>{t("common.error")}</strong> {filterOptionsError}
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragOver={handleDragOver}
    >
      <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-2 md:p-3">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 md:gap-0">
            <div className="flex items-center space-x-2 md:space-x-3">
              {/* Active Filters */}
              <div className="flex items-center space-x-2 overflow-x-auto">
                {appliedFilters.length > 0 ? (
                  <div className="flex items-center space-x-2 min-w-0">
                    <Typography
                      variant="body2"
                      className="text-gray-600 dark:text-gray-300 font-medium text-sm whitespace-nowrap"
                    >
                      {t("editCollectionPage.activeFilters")}:
                    </Typography>
                    <div className="flex space-x-2 overflow-x-auto">
                      {appliedFilters
                        .slice(0, window.innerWidth < 768 ? 2 : 3)
                        .map((filter, index) => (
                          <Chip
                            key={index}
                            label={`${filter.title}: ${
                              filter.valueName || filter.value
                            }`}
                            size="small"
                            color="primary"
                            variant="filled"
                            className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 h-6 text-xs whitespace-nowrap"
                          />
                        ))}
                      {appliedFilters.length >
                        (window.innerWidth < 768 ? 2 : 3) && (
                        <Chip
                          label={`+${
                            appliedFilters.length -
                            (window.innerWidth < 768 ? 2 : 3)
                          } ${t("editCollectionPage.more", "daha")}`}
                          size="small"
                          variant="outlined"
                          className="border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 h-6 text-xs whitespace-nowrap"
                        />
                      )}
                    </div>
                  </div>
                ) : (
                  <Typography
                    variant="body2"
                    className="text-gray-500 dark:text-gray-400 text-sm"
                  >
                    {t("editCollectionPage.noActiveFilters")}
                  </Typography>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outlined"
                startIcon={<FilterIcon className="h-3 w-3" />}
                onClick={() => setFilterModalOpen(true)}
                size="small"
                className="border-gray-300! dark:border-gray-600! text-gray-700! dark:text-gray-300! hover:bg-gray-50! dark:hover:bg-gray-700! text-xs w-full md:w-auto"
              >
                {t("common.filters")}
              </Button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Desktop Layout */}
          <div className="hidden lg:flex h-full">
            {/* Left Panel - Available Products */}
            <div className="w-1/2 flex flex-col bg-white dark:bg-gray-800 border-r-2 border-gray-200 dark:border-gray-700">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                <div className="flex items-center justify-between">
                  <div>
                    <Typography
                      variant="h6"
                      className="font-semibold text-gray-900 dark:text-gray-100 text-base"
                    >
                      {t("editCollectionPage.collectionProducts")}
                    </Typography>
                    <Typography
                      variant="caption"
                      className="text-gray-500 dark:text-gray-400 text-sm"
                    >
                      {availableProductsMeta?.totalProduct || 0}{" "}
                      {t("editCollectionPage.productsFound")}
                    </Typography>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {t("common.page")} {currentPage}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex-1 p-4 overflow-y-auto bg-gray-50 dark:bg-gray-900">
                {availableProductsStatus === "loading" ? (
                  <div className="flex justify-center items-center h-64">
                    <CircularProgress
                      size={32}
                      className="text-blue-500 dark:text-blue-400"
                    />
                  </div>
                ) : availableProductsError ? (
                  <div className="text-red-600 dark:text-red-400 text-center p-8 bg-white dark:bg-gray-800 rounded-lg border border-red-200 dark:border-red-800">
                    <AlertTriangle className="h-8 w-8 mx-auto mb-3" />
                    <p className="text-sm font-medium mb-2">
                      {t(
                        "editCollectionPage.productsLoadError",
                        "Ürünler yüklenemedi"
                      )}
                    </p>
                    <p className="text-xs">{availableProductsError}</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-4 gap-3 min-w-0">
                      {availableProducts.map((product) => (
                        <div
                          key={`${product.productCode}-${
                            product.colorCode || ""
                          }`}
                          className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow min-w-0"
                        >
                          <ProductCard
                            product={product}
                            onAdd={() => handleAddToConstants(product)}
                            isAdded={isProductAdded(product)}
                          />
                        </div>
                      ))}
                    </div>

                    {/* Pagination */}
                    {availableProductsMeta &&
                      availableProductsMeta.totalProduct > 36 && (
                        <div className="flex justify-center pt-4">
                          <Pagination
                            count={Math.ceil(
                              availableProductsMeta.totalProduct / 36
                            )}
                            page={currentPage}
                            onChange={handlePageChange}
                            color="primary"
                            size="medium"
                            showFirstButton
                            showLastButton
                            sx={{
                              "& .MuiPaginationItem-root": {
                                color: "text.primary",
                              },
                              "& .MuiPaginationItem-root.Mui-selected": {
                                backgroundColor: "primary.main",
                                color: "primary.contrastText",
                              },
                              "& .MuiPaginationItem-root:hover": {
                                backgroundColor: "action.hover",
                              },
                            }}
                          />
                        </div>
                      )}
                  </div>
                )}
              </div>
            </div>

            {/* Right Panel - Constants */}
            <div
              className="w-1/2 flex flex-col bg-white dark:bg-gray-800"
              ref={containerRef}
            >
              <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-blue-50 dark:bg-gray-900!">
                <div className="flex items-center justify-between">
                  <div>
                    <Typography
                      variant="h6"
                      className="font-semibold text-gray-900 dark:text-gray-100 text-base"
                    >
                      {t("editCollectionPage.constants")}
                    </Typography>
                    <Typography
                      variant="caption"
                      className="text-gray-500 dark:text-gray-400 text-sm"
                    >
                      {pinnedProducts.length}{" "}
                      {t("editCollectionPage.productsPinned")}
                    </Typography>
                  </div>
                  <div className="flex items-center space-x-2">
                    {/* Layout Mode Buttons */}
                    <div className="flex items-center space-x-1 bg-white dark:bg-gray-700 rounded-lg p-1 shadow-sm">
                      <button
                        onClick={() => setLayoutMode("2x2")}
                        className={`p-2 rounded-md transition-colors ${
                          layoutMode === "2x2"
                            ? "bg-blue-500 dark:bg-gray-500! text-white shadow-sm"
                            : "hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300"
                        }`}
                        title="2x2 Grid"
                      >
                        <div className="w-4 h-4 grid grid-cols-2 gap-0.5">
                          {[...Array(4)].map((_, i) => (
                            <div
                              key={i}
                              className="bg-current rounded-sm"
                            ></div>
                          ))}
                        </div>
                      </button>
                      <button
                        onClick={() => setLayoutMode("3x2")}
                        className={`p-2 rounded-md transition-colors ${
                          layoutMode === "3x2"
                            ? "bg-blue-500 dark:bg-gray-500! text-white shadow-sm"
                            : "hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300"
                        }`}
                        title="3x2 Grid"
                      >
                        <div className="w-4 h-4 grid grid-cols-3 gap-0.5">
                          {[...Array(6)].map((_, i) => (
                            <div
                              key={i}
                              className="bg-current rounded-sm"
                            ></div>
                          ))}
                        </div>
                      </button>
                      <button
                        onClick={() => setLayoutMode("4x4")}
                        className={`p-2 rounded-md transition-colors ${
                          layoutMode === "4x4"
                            ? "bg-blue-500 dark:bg-gray-500! text-white shadow-sm"
                            : "hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300"
                        }`}
                        title="4x4 Grid"
                      >
                        <Grid3X3 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex-1 p-4 overflow-y-auto bg-blue-50/30 dark:bg-gray-900/50!">
                <div
                  className={`min-h-[400px] border-2 border-dashed rounded-xl p-4 bg-white dark:bg-gray-800 transition-all duration-200 ${
                    activeId
                      ? "border-blue-400 dark:border-blue-500 bg-blue-50/30 dark:bg-blue-900/10"
                      : "border-blue-300 dark:border-gray-600"
                  }`}
                >
                  <SortableContext
                    items={currentPageProducts.map(
                      (p) => `${p.productCode}-${p.colorCode || ""}`
                    )}
                    strategy={rectSortingStrategy}
                  >
                    <div
                      className={`grid ${responsiveClasses.gap} min-w-0`}
                      style={{
                        gridTemplateColumns: `repeat(${currentLayout.cols}, minmax(0, 1fr))`,
                        gridAutoRows: "min-content",
                      }}
                    >
                      {currentPageProducts.map((product, index) => (
                        <div
                          key={`${product.productCode}-${
                            product.colorCode || ""
                          }`}
                          className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 min-w-0"
                        >
                          <DraggableConstantCard
                            product={product}
                            onRemove={() => handleRemoveFromPinned(product)}
                            isDragging={
                              activeId ===
                              `${product.productCode}-${
                                product.colorCode || ""
                              }`
                            }
                            layoutMode={layoutMode}
                            position={startIndex + index + 1}
                            containerWidth={containerWidth}
                            isOver={
                              dragOverZone ===
                              `${product.productCode}-${
                                product.colorCode || ""
                              }`
                            }
                          />
                        </div>
                      ))}
                      {/* Placeholders */}
                      {[...Array(placeholdersNeeded)].map((_, index) => (
                        <PlaceholderCard
                          key={`placeholder-${index}`}
                          layoutMode={layoutMode}
                          containerWidth={containerWidth}
                          isDropTarget={dragOverZone === `placeholder-${index}`}
                        />
                      ))}
                    </div>
                  </SortableContext>

                  {pinnedProducts.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-48 text-gray-500 dark:text-gray-400">
                      <div className="w-16 h-16 bg-blue-100 dark:bg-gray-700! rounded-full flex items-center justify-center mb-4">
                        <Info className="h-8 w-8 text-blue-500 dark:text-gray-400!" />
                      </div>
                      <Typography
                        variant="h6"
                        className="text-center text-base font-medium mb-2"
                      >
                        {t("editCollectionPage.noConstantsYet")}
                      </Typography>
                      <Typography
                        variant="caption"
                        className="text-center text-gray-400 dark:text-gray-500 max-w-xs"
                      >
                        {t("editCollectionPage.noConstantsDescription")}
                      </Typography>
                    </div>
                  )}
                </div>

                {/* Constants Pagination */}
                {pinnedProducts.length > 0 && (
                  <div className="flex justify-center mt-4">
                    <Pagination
                      count={totalPages}
                      page={constantsPage}
                      onChange={handleConstantsPageChange}
                      color="primary"
                      size="medium"
                      sx={{
                        "& .MuiPaginationItem-root": {
                          color: "text.primary",
                        },
                        "& .MuiPaginationItem-root.Mui-selected": {
                          backgroundColor: "primary.main",
                          color: "primary.contrastText",
                        },
                        "& .MuiPaginationItem-root:hover": {
                          backgroundColor: "action.hover",
                        },
                      }}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Mobile Layout */}
          <div className="lg:hidden flex flex-col h-full">
            {/* Mobile Tab Navigation */}
            <div className="flex bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setMobileTab("products")}
                className={`flex-1 py-3 px-4 text-sm font-medium border-b-2 transition-colors ${
                  mobileTab === "products"
                    ? "border-blue-500 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20"
                    : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                }`}
              >
                {t("editCollectionPage.products")} (
                {availableProductsMeta?.totalProduct || 0})
              </button>
              <button
                onClick={() => setMobileTab("constants")}
                className={`flex-1 py-3 px-4 text-sm font-medium border-b-2 transition-colors ${
                  mobileTab === "constants"
                    ? "border-blue-500 dark:bg-gray-500! text-blue-600 dark:text-gray-300! bg-blue-50 dark:bg-gray-800!"
                    : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                }`}
              >
                {t("editCollectionPage.constants")} ({pinnedProducts.length})
              </button>
            </div>

            {/* Mobile Content */}
            <div className="flex-1 overflow-hidden">
              {mobileTab === "products" ? (
                <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900">
                  <div className="p-3 overflow-y-auto">
                    {availableProductsStatus === "loading" ? (
                      <div className="flex justify-center items-center h-64">
                        <CircularProgress
                          size={24}
                          className="text-gray-500 dark:text-gray-400"
                        />
                      </div>
                    ) : availableProductsError ? (
                      <div className="text-red-600 dark:text-red-400 text-center p-6 bg-white dark:bg-gray-800 rounded-lg">
                        <AlertTriangle className="h-6 w-6 mx-auto mb-2" />
                        <p className="text-sm">{availableProductsError}</p>
                      </div>
                    ) : (
                      <>
                        <div className="grid grid-cols-3 gap-2 min-w-0">
                          {availableProducts.map((product) => (
                            <ProductCard
                              key={`${product.productCode}-${
                                product.colorCode || ""
                              }`}
                              product={product}
                              onAdd={() => handleAddToConstants(product)}
                              isAdded={isProductAdded(product)}
                            />
                          ))}
                        </div>

                        {availableProductsMeta &&
                          availableProductsMeta.totalProduct > 36 && (
                            <div className="flex justify-center mt-4">
                              <Pagination
                                count={Math.ceil(
                                  availableProductsMeta.totalProduct / 36
                                )}
                                page={currentPage}
                                onChange={handlePageChange}
                                color="primary"
                                size="small"
                                showFirstButton
                                showLastButton
                                sx={{
                                  "& .MuiPaginationItem-root": {
                                    color: "text.primary",
                                  },
                                  "& .MuiPaginationItem-root.Mui-selected": {
                                    backgroundColor: "primary.main",
                                    color: "primary.contrastText",
                                  },
                                  "& .MuiPaginationItem-root:hover": {
                                    backgroundColor: "action.hover",
                                  },
                                }}
                              />
                            </div>
                          )}
                      </>
                    )}
                  </div>
                </div>
              ) : (
                <div
                  className="h-full flex flex-col bg-gray-50/30 dark:bg-gray-900/50!"
                  ref={containerRef}
                >
                  <div className="p-3 flex items-center justify-between bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                    <Typography
                      variant="subtitle2"
                      className="font-medium text-gray-900 dark:text-gray-100"
                    >
                      {t("editCollectionPage.layout")}
                    </Typography>
                    <div className="flex items-center space-x-1 bg-gray-100 dark:bg-gray-700 rounded p-1">
                      <button
                        onClick={() => setLayoutMode("2x2")}
                        className={`p-1.5 rounded ${
                          layoutMode === "2x2"
                            ? "bg-gray-500 text-white"
                            : "hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300"
                        }`}
                      >
                        <div className="w-3 h-3 grid grid-cols-2 gap-0.5">
                          {[...Array(4)].map((_, i) => (
                            <div
                              key={i}
                              className="bg-current rounded-sm"
                            ></div>
                          ))}
                        </div>
                      </button>
                      <button
                        onClick={() => setLayoutMode("3x2")}
                        className={`p-1.5 rounded ${
                          layoutMode === "3x2"
                            ? "bg-gray-500 text-white"
                            : "hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300"
                        }`}
                      >
                        <div className="w-3 h-3 grid grid-cols-3 gap-0.5">
                          {[...Array(6)].map((_, i) => (
                            <div
                              key={i}
                              className="bg-current rounded-sm"
                            ></div>
                          ))}
                        </div>
                      </button>
                      <button
                        onClick={() => setLayoutMode("4x4")}
                        className={`p-1.5 rounded ${
                          layoutMode === "4x4"
                            ? "bg-gray-500 text-white"
                            : "hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300"
                        }`}
                      >
                        <Grid3X3 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>

                  <div className="flex-1 p-3 overflow-y-auto">
                    <div className="min-h-[300px] border-2 border-dashed border-gray-300 dark:border-gray-600! rounded-lg p-3 bg-white dark:bg-gray-800">
                      <SortableContext
                        items={currentPageProducts.map(
                          (p) => `${p.productCode}-${p.colorCode || ""}`
                        )}
                        strategy={rectSortingStrategy}
                      >
                        <div
                          className={`grid ${responsiveClasses.gap} min-w-0`}
                          style={{
                            gridTemplateColumns: `repeat(${currentLayout.cols}, minmax(0, 1fr))`,
                            gridAutoRows: "min-content",
                          }}
                        >
                          {currentPageProducts.map((product) => (
                            <DraggableConstantCard
                              key={`${product.productCode}-${
                                product.colorCode || ""
                              }`}
                              product={product}
                              onRemove={() => handleRemoveFromPinned(product)}
                              isDragging={
                                activeId ===
                                `${product.productCode}-${
                                  product.colorCode || ""
                                }`
                              }
                              layoutMode={layoutMode}
                              containerWidth={containerWidth}
                              isOver={
                                dragOverZone ===
                                `${product.productCode}-${
                                  product.colorCode || ""
                                }`
                              }
                            />
                          ))}
                          {[...Array(placeholdersNeeded)].map((_, index) => (
                            <PlaceholderCard
                              key={`placeholder-${index}`}
                              layoutMode={layoutMode}
                              containerWidth={containerWidth}
                              isDropTarget={
                                dragOverZone === `placeholder-${index}`
                              }
                            />
                          ))}
                        </div>
                      </SortableContext>

                      {pinnedProducts.length === 0 && (
                        <div className="flex flex-col items-center justify-center h-32 text-gray-500 dark:text-gray-400">
                          <Info className="h-6 w-6 mb-2 text-gray-400 dark:text-gray-500" />
                          <Typography
                            variant="caption"
                            className="text-center text-xs"
                          >
                            {t("editCollectionPage.addProductsDescription")}
                          </Typography>
                        </div>
                      )}
                    </div>

                    {pinnedProducts.length > 0 && (
                      <div className="flex justify-center mt-3">
                        <Pagination
                          count={totalPages}
                          page={constantsPage}
                          onChange={handleConstantsPageChange}
                          color="primary"
                          size="small"
                          sx={{
                            "& .MuiPaginationItem-root": {
                              color: "text.primary",
                            },
                            "& .MuiPaginationItem-root.Mui-selected": {
                              backgroundColor: "primary.main",
                              color: "primary.contrastText",
                            },
                            "& .MuiPaginationItem-root:hover": {
                              backgroundColor: "action.hover",
                            },
                          }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-2 md:p-3">
          <div className="flex flex-col gap-2 sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-2">
            <Button
              variant="outlined"
              onClick={handleCancel}
              size="small"
              className="border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 min-w-[80px] text-xs w-full sm:w-auto"
            >
              {t("common.cancel")}
            </Button>
            <Button
              variant="contained"
              onClick={handleSave}
              size="small"
              disabled={saveStatus === "loading"}
              className="bg-black dark:bg-gray-700 hover:bg-gray-800 dark:hover:bg-gray-600 text-white min-w-[80px] text-xs w-full sm:w-auto"
            >
              {saveStatus === "loading" ? (
                <div className="flex items-center gap-2">
                  <CircularProgress size={12} className="text-white" />
                  {t("common.saving", "Saving...")}
                </div>
              ) : (
                t("common.save")
              )}
            </Button>
          </div>
        </div>

        {/* Drag Overlay */}
        <DragOverlay dropAnimation={null}>
          {activeId && draggedProduct ? (
            <div className="transform rotate-3 scale-110 shadow-2xl">
              <DraggableConstantCard
                product={draggedProduct}
                isDragging={true}
                layoutMode={layoutMode}
                containerWidth={containerWidth}
              />
            </div>
          ) : null}
        </DragOverlay>

        {/* Modals */}
        <FilterModal
          isOpen={filterModalOpen}
          onClose={() => setFilterModalOpen(false)}
          filterOptions={filterOptions}
          currentFilters={appliedFilters}
          onApplyFilters={handleApplyFilters}
          onClearFilters={handleClearFilters}
        />

        <ConfirmationModal
          open={confirmModalOpen}
          onClose={() => setConfirmModalOpen(false)}
          onConfirm={confirmRemoveFromPinned}
          title={t("editCollectionPage.removeProduct")}
          message={t("editCollectionPage.removeProductMessage")}
          type="warning"
        />

        <ConfirmationModal
          open={saveConfirmModalOpen}
          onClose={() => setSaveConfirmModalOpen(false)}
          onConfirm={confirmSave}
          title={t("editCollectionPage.saveChanges")}
          message={t("editCollectionPage.saveChangesMessage")}
          type="warning"
        />

        <ConfirmationModal
          open={successModalOpen}
          onClose={() => setSuccessModalOpen(false)}
          onConfirm={() => setSuccessModalOpen(false)}
          title={t("editCollectionPage.operationSuccessful")}
          message={t("editCollectionPage.operationSuccessfulMessage")}
          type="success"
        />

        <ConfirmationModal
          open={errorModalOpen}
          onClose={() => setErrorModalOpen(false)}
          onConfirm={() => setErrorModalOpen(false)}
          title={t("editCollectionPage.errorOccurred")}
          message={t("editCollectionPage.errorOccurredMessage")}
          type="error"
        />
        <ConfirmationModal
          open={unsavedChangesModalOpen}
          onClose={cancelNavigation}
          onConfirm={confirmNavigationAndDiscard}
          title={t("editCollectionPage.unsavedChanges", "Unsaved Changes")}
          message={t(
            "editCollectionPage.unsavedChangesMessage",
            "You have unsaved changes. If you leave now, all changes will be lost. Do you want to continue?"
          )}
          type="warning"
        />
      </div>
    </DndContext>
  );
}
