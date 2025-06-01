"use client";

import type React from "react";

import { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogActions,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Typography,
  IconButton,
  Divider,
  TextField,
  Box,
  Checkbox,
  FormControlLabel,
  Popper,
  Paper,
  MenuList,
  ClickAwayListener,
  Grow,
} from "@mui/material";
import { X, Filter, Trash2, Search, ChevronDown } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { ApiFilterOption, AppliedFilter } from "@/types";

interface FilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  filterOptions: ApiFilterOption[];
  currentFilters: AppliedFilter[];
  onApplyFilters: (filters: AppliedFilter[]) => void;
  onClearFilters: () => void;
}

interface FilterMenuProps {
  option: ApiFilterOption;
  onSelect: (
    filterId: string,
    value: string,
    title: string,
    valueName: string | null,
    comparisonType: number
  ) => void;
  disabled: (value: string) => boolean;
}

function FilterMenu({ option, onSelect, disabled }: FilterMenuProps) {
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLButtonElement>(null);
  const { t } = useTranslation();

  const handleToggle = () => {
    setOpen((prevOpen) => !prevOpen);
  };

  const handleClose = (event: Event | React.SyntheticEvent) => {
    if (
      anchorRef.current &&
      anchorRef.current.contains(event.target as HTMLElement)
    ) {
      return;
    }
    setOpen(false);
  };

  const handleMenuItemClick = (value: string, valueName: string | null) => {
    onSelect(option.id, value, option.title, valueName, option.comparisonType);
    setOpen(false);
  };

  return (
    <div className="relative">
      <button
        ref={anchorRef}
        onClick={handleToggle}
        className="w-full h-[30px] px-2 text-left border border-gray-300 dark:border-gray-600 rounded text-xs flex items-center justify-between bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200"
        aria-controls={open ? "filter-menu" : undefined}
        aria-haspopup="true"
        aria-expanded={open ? "true" : undefined}
      >
        <span className="truncate">{option.title}</span>
        <ChevronDown className="h-3 w-3 text-gray-500 dark:text-gray-400" />
      </button>
      <Popper
        open={open}
        anchorEl={anchorRef.current}
        role={undefined}
        placement="bottom-start"
        transition
        disablePortal
        style={{ zIndex: 1300, width: anchorRef.current?.offsetWidth }}
      >
        {({ TransitionProps, placement }) => (
          <Grow
            {...TransitionProps}
            style={{
              transformOrigin:
                placement === "bottom-start" ? "left top" : "left bottom",
            }}
          >
            <Paper className="max-h-[200px] overflow-y-auto shadow-md bg-white dark:bg-gray-800! dark:border-1">
              <ClickAwayListener onClickAway={handleClose}>
                <MenuList
                  id="filter-menu"
                  autoFocusItem
                  className="text-gray-800 dark:text-gray-200!"
                >
                  {option.values.map((value) => (
                    <MenuItem
                      key={value.value}
                      onClick={() =>
                        handleMenuItemClick(value.value, value.valueName)
                      }
                      disabled={disabled(value.value)}
                      sx={{
                        fontSize: "0.7rem",
                        minHeight: "28px",
                        "&.Mui-disabled": {
                          opacity: 0.5,
                        },
                      }}
                      className="text-gray-800! dark:text-gray-200! hover:bg-gray-100! dark:hover:bg-gray-700!"
                    >
                      {value.valueName || value.value}
                    </MenuItem>
                  ))}
                </MenuList>
              </ClickAwayListener>
            </Paper>
          </Grow>
        )}
      </Popper>
    </div>
  );
}

export function FilterModal({
  isOpen,
  onClose,
  filterOptions,
  currentFilters,
  onApplyFilters,
  onClearFilters,
}: FilterModalProps) {
  const [localFilters, setLocalFilters] = useState<AppliedFilter[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [stockFilter, setStockFilter] = useState({
    min: "",
    max: "",
    allSizes: false,
  });
  const [sortBy, setSortBy] = useState("name");
  const [selectedDepot, setSelectedDepot] = useState("all");
  const { t } = useTranslation();

  useEffect(() => {
    setLocalFilters([...currentFilters]);
  }, [currentFilters, isOpen]);

  const handleAddFilter = (
    filterId: string,
    value: string,
    title: string,
    valueName: string | null,
    comparisonType: number
  ) => {
    const exists = localFilters.some(
      (filter) => filter.id === filterId && filter.value === value
    );

    if (!exists) {
      const newFilter: AppliedFilter = {
        id: filterId,
        value,
        title,
        valueName,
        comparisonType,
      };
      setLocalFilters([...localFilters, newFilter]);
    }
  };

  const handleRemoveFilter = (index: number) => {
    setLocalFilters(localFilters.filter((_, i) => i !== index));
  };

  const handleApply = () => {
    onApplyFilters(localFilters);
    onClose();
  };

  const handleClear = () => {
    setLocalFilters([]);
    onClearFilters();
  };

  const handleClose = () => {
    setLocalFilters([...currentFilters]);
    onClose();
  };

  const filteredOptions = filterOptions.filter((option) =>
    option.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const isFilterValueDisabled = (filterId: string, value: string) => {
    return localFilters.some((f) => f.id === filterId && f.value === value);
  };

  return (
    <Dialog
      open={isOpen}
      onClose={handleClose}
      maxWidth="lg"
      fullWidth
      fullScreen={window.innerWidth < 768} // Full screen on mobile
      PaperProps={{
        sx: {
          borderRadius: { xs: 0, md: 1.5 }, // No border radius on mobile
          maxHeight: { xs: "100vh", md: "80vh" },
          width: { xs: "100%", md: "900px" },
          margin: { xs: 0, md: "auto" },
          bgcolor: "background.paper", // This will respect dark mode
        },
        className: "bg-white dark:bg-gray-800",
      }}
    >
      {/* Header */}
      <Box className="flex items-center justify-between p-2 md:p-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-700 dark:text-gray-300" />
          <Typography
            variant="subtitle1"
            className="font-semibold text-gray-900 dark:text-gray-100 text-sm"
          >
            {t("common.filters")}
          </Typography>
        </div>
        <IconButton
          onClick={handleClose}
          size="small"
          className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
        >
          <X className="h-4 w-4 dark:invert" />
        </IconButton>
      </Box>

      <DialogContent className="flex flex-col p-0 bg-white dark:bg-gray-800">
        {/* Search and Quick Filters */}
        <Box className="p-2 md:p-3 bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-3 mb-2 md:mb-3">
            {/* Search */}
            <TextField
              placeholder={t(
                "editCollectionPage.filterModal.searchFilter",
                "Filtre ara..."
              )}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <Search className="h-3 w-3 text-gray-400 dark:text-gray-500 mr-2" />
                ),
                className:
                  "text-gray-800 dark:text-gray-100! dark:bg-gray-700!",
              }}
              size="small"
              sx={{
                "& .MuiInputBase-input": {
                  fontSize: "0.75rem",
                  padding: "6px 8px",
                  color: "inherit",
                },
                "& .MuiInputBase-root": {
                  height: "30px",
                  backgroundColor: "background.paper",
                  borderColor: "divider",
                },
                "& .MuiOutlinedInput-notchedOutline": {
                  borderColor: "divider",
                },
                "&:hover .MuiOutlinedInput-notchedOutline": {
                  borderColor: "action.hover",
                },
              }}
              className="bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200"
            />

            {/* Stock Filters */}
            <FormControl size="small">
              <InputLabel
                sx={{ fontSize: "0.75rem", color: "text.secondary" }}
                className="text-gray-600 dark:text-white!"
              >
                {t("editCollectionPage.filterModal.depot", "Depo")}
              </InputLabel>
              <Select
                label={t("editCollectionPage.filterModal.depot", "Depo")}
                value={selectedDepot}
                onChange={(e) => setSelectedDepot(e.target.value)}
                sx={{
                  "& .MuiSelect-select": {
                    fontSize: "0.75rem",
                    padding: "6px 8px",
                    color: "inherit",
                  },
                  height: "30px",
                  backgroundColor: "background.paper",
                  borderColor: "divider",
                  "& .MuiOutlinedInput-notchedOutline": {
                    borderColor: "divider",
                  },
                  "&:hover .MuiOutlinedInput-notchedOutline": {
                    borderColor: "action.hover",
                  },
                }}
                className="bg-white dark:bg-gray-700! text-gray-800 dark:text-gray-200!"
              >
                <MenuItem
                  value="all"
                  sx={{ fontSize: "0.75rem" }}
                  className="text-gray-800 dark:text-gray-200"
                >
                  {t("editCollectionPage.filterModal.allDepots", "Tüm Depolar")}
                </MenuItem>
                <MenuItem
                  value="main"
                  sx={{ fontSize: "0.75rem" }}
                  className="text-gray-800 dark:text-gray-200"
                >
                  {t("editCollectionPage.filterModal.mainDepot", "Ana Depo")}
                </MenuItem>
                <MenuItem
                  value="secondary"
                  sx={{ fontSize: "0.75rem" }}
                  className="text-gray-800 dark:text-gray-200"
                >
                  {t(
                    "editCollectionPage.filterModal.secondaryDepot",
                    "Yedek Depo"
                  )}
                </MenuItem>
              </Select>
            </FormControl>

            <div className="grid grid-cols-2 gap-2">
              <TextField
                size="small"
                placeholder={t(
                  "editCollectionPage.filterModal.minStock",
                  "Min Stok"
                )}
                value={stockFilter.min}
                onChange={(e) =>
                  setStockFilter({ ...stockFilter, min: e.target.value })
                }
                InputProps={{
                  className:
                    "text-gray-800 dark:text-gray-100! dark:bg-gray-700!",
                }}
                sx={{
                  "& .MuiInputBase-input": {
                    fontSize: "0.75rem",
                    padding: "6px 8px",
                  },
                  "& .MuiInputBase-root": {
                    height: "30px",
                    borderColor: "divider",
                  },
                  "& .MuiOutlinedInput-notchedOutline": {
                    borderColor: "divider",
                  },
                  "&:hover .MuiOutlinedInput-notchedOutline": {
                    borderColor: "action.hover",
                  },
                }}
                className="bg-white dark:bg-gray-700"
              />

              <TextField
                size="small"
                placeholder={t(
                  "editCollectionPage.filterModal.maxStock",
                  "Max Stok"
                )}
                value={stockFilter.max}
                onChange={(e) =>
                  setStockFilter({ ...stockFilter, max: e.target.value })
                }
                InputProps={{
                  className:
                    "text-gray-800 dark:text-gray-100! dark:bg-gray-700!",
                }}
                sx={{
                  "& .MuiInputBase-input": {
                    fontSize: "0.75rem",
                    padding: "6px 8px",
                  },
                  "& .MuiInputBase-root": {
                    height: "30px",
                    backgroundColor: "background.paper",
                    borderColor: "divider",
                  },
                  "& .MuiOutlinedInput-notchedOutline": {
                    borderColor: "divider",
                  },
                  "&:hover .MuiOutlinedInput-notchedOutline": {
                    borderColor: "action.hover",
                  },
                }}
                className="bg-white dark:bg-gray-700! text-gray-800 dark:text-gray-200!"
              />
            </div>
          </div>

          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 md:gap-0">
            <FormControlLabel
              control={
                <Checkbox
                  checked={stockFilter.allSizes}
                  onChange={(e) =>
                    setStockFilter({
                      ...stockFilter,
                      allSizes: e.target.checked,
                    })
                  }
                  size="small"
                  className="text-blue-600 dark:text-blue-300!"
                />
              }
              label={t(
                "editCollectionPage.filterModal.stockInAllSizes",
                "Tüm Bedenlerinde Stok Olanlar"
              )}
              className="text-xs text-gray-800 dark:text-gray-200"
              sx={{
                "& .MuiFormControlLabel-label": {
                  fontSize: "0.75rem",
                  color: "inherit",
                },
              }}
            />

            <FormControl
              size="small"
              className="min-w-[120px] w-full md:w-auto"
            >
              <InputLabel
                sx={{ fontSize: "0.75rem" }}
                className="text-gray-600 dark:text-white!"
              >
                {t("editCollectionPage.filterModal.sorting", "Sıralama")}
              </InputLabel>
              <Select
                label={t("editCollectionPage.filterModal.sorting", "Sıralama")}
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                sx={{
                  "& .MuiSelect-select": {
                    fontSize: "0.75rem",
                    padding: "6px 8px",
                    color: "inherit",
                  },
                  height: "30px",
                  backgroundColor: "background.paper",
                  borderColor: "divider",
                  "& .MuiOutlinedInput-notchedOutline": {
                    borderColor: "divider",
                  },
                  "&:hover .MuiOutlinedInput-notchedOutline": {
                    borderColor: "action.hover",
                  },
                }}
                className="bg-white dark:bg-gray-700! text-gray-800 dark:text-gray-200!"
              >
                <MenuItem
                  value="name"
                  sx={{ fontSize: "0.75rem" }}
                  className="text-gray-800 dark:text-gray-200"
                >
                  {t("editCollectionPage.filterModal.sortByName", "İsme Göre")}
                </MenuItem>
                <MenuItem
                  value="price"
                  sx={{ fontSize: "0.75rem" }}
                  className="text-gray-800 dark:text-gray-200"
                >
                  {t(
                    "editCollectionPage.filterModal.sortByPrice",
                    "Fiyata Göre"
                  )}
                </MenuItem>
                <MenuItem
                  value="date"
                  sx={{ fontSize: "0.75rem" }}
                  className="text-gray-800 dark:text-gray-200"
                >
                  {t(
                    "editCollectionPage.filterModal.sortByDate",
                    "Tarihe Göre"
                  )}
                </MenuItem>
              </Select>
            </FormControl>
          </div>
        </Box>

        {/* Applied Filters */}
        <Box className="p-2 md:p-3 bg-gray-50 dark:bg-gray-900 border-b border-gray-100 dark:border-gray-700">
          <Typography
            variant="caption"
            className="font-medium mb-2 text-gray-700 dark:text-gray-300 block text-xs"
          >
            {t(
              "editCollectionPage.filterModal.selectedFilters",
              "Seçili Filtreler"
            )}{" "}
            ({localFilters.length})
          </Typography>
          <div className="min-h-[50px] bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 p-2">
            {localFilters.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {localFilters.map((filter, index) => (
                  <Chip
                    key={index}
                    label={`${filter.title}: ${
                      filter.valueName || filter.value
                    }`}
                    onDelete={() => handleRemoveFilter(index)}
                    deleteIcon={<Trash2 className="h-3 w-3" />}
                    size="small"
                    className="p-2! flex gap-2 bg-blue-50 dark:bg-gray-200! text-blue-700 dark:text-gray-700! border border-blue-200 dark:border-gray-800! text-xs h-6"
                    sx={{
                      "& .MuiChip-label": {
                        fontSize: "0.7rem",
                        padding: "0 6px",
                      },
                    }}
                  />
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-6 text-gray-400 dark:text-gray-500 text-xs">
                {t(
                  "editCollectionPage.filterModal.noFiltersSelected",
                  "Henüz filtre seçilmedi"
                )}
              </div>
            )}
          </div>
        </Box>

        {/* Filter Options Grid */}
        <Box className="h-50 p-2 md:p-3 bg-white dark:bg-gray-800">
          <Typography
            variant="caption"
            className="font-medium mb-2 text-gray-700 dark:text-gray-300 block text-xs"
          >
            {t(
              "editCollectionPage.filterModal.availableFilters",
              "Mevcut Filtreler"
            )}{" "}
            ({filteredOptions.length})
          </Typography>
          <div className="h-full overflow-y-auto md:h-min">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
              {filteredOptions.map((option) => (
                <FilterMenu
                  key={option.id}
                  option={option}
                  onSelect={handleAddFilter}
                  disabled={(value) => isFilterValueDisabled(option.id, value)}
                />
              ))}
            </div>
          </div>
        </Box>
      </DialogContent>

      <Divider className="border-gray-200 dark:border-gray-700!" />

      <DialogActions className="p-2 md:p-3 bg-gray-50 dark:bg-gray-900 gap-2 flex-col sm:flex-row">
        <Button
          onClick={handleClear}
          variant="outlined"
          size="small"
          className="border-gray-300 dark:border-gray-600! text-gray-700 dark:text-gray-300! hover:bg-gray-100 dark:hover:bg-gray-800! min-w-[100px] w-full sm:w-auto text-xs capitalize!"
        >
          {t("common.clearFilters")}
        </Button>
        <Button
          onClick={handleApply}
          variant="contained"
          size="small"
          className="bg-blue-600 dark:bg-blue-700 hover:bg-blue-700 dark:hover:bg-blue-800 text-white min-w-[80px] w-full sm:w-auto text-xs ml-0! capitalize!"
        >
          {t("common.applyFilters")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
