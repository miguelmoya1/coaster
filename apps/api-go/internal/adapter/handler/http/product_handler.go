package http

import (
	"context"
	"net/http"

	"api-go/internal/adapter/handler/middleware"
	"api-go/internal/core/domain"
	"api-go/internal/service"
)

type ProductService interface {
	List(ctx context.Context, establishmentID string) ([]domain.Product, error)
	Create(ctx context.Context, establishmentID string, input service.CreateProductInput) error
	Update(ctx context.Context, establishmentID, productID string, changes domain.ProductChanges) error
	SetStock(ctx context.Context, establishmentID, productID string, stock int) error
	Delete(ctx context.Context, establishmentID, productID string) error
}

// ProductHandler is products.controller.ts.
type ProductHandler struct {
	products ProductService
}

func NewProductHandler(products ProductService) *ProductHandler {
	return &ProductHandler{products: products}
}

func (h *ProductHandler) RegisterRoutes(mux *http.ServeMux, guard *middleware.Guard) {
	inventory := middleware.Modules(domain.ModuleInventory)

	handle(mux, guard, "GET /establishments/{establishmentId}/products", h.list,
		middleware.Permissions(domain.PermissionViewProducts), inventory)
	handle(mux, guard, "POST /establishments/{establishmentId}/products", h.create,
		middleware.Permissions(domain.PermissionCreateProduct), inventory)
	handle(mux, guard, "PATCH /establishments/{establishmentId}/products/{productId}/stock", h.updateStock,
		middleware.Permissions(domain.PermissionUpdateProductStock), inventory)
	handle(mux, guard, "PATCH /establishments/{establishmentId}/products/{productId}", h.update,
		middleware.Permissions(domain.PermissionUpdateProduct), inventory)
	handle(mux, guard, "DELETE /establishments/{establishmentId}/products/{productId}", h.delete,
		middleware.Permissions(domain.PermissionDeleteProduct), inventory)
}

// createProductRequest is CreateProductDto. The oneof of allergens is ALLERGENS; a test
// checks it against domain.Allergens.
type createProductRequest struct {
	Name          string    `json:"name" validate:"required" msg:"required=REQUIRED,type=INVALID_TYPE"`
	CategoryID    string    `json:"categoryId" validate:"required,uuid4" msg:"required=REQUIRED,uuid4=INVALID_TYPE,type=INVALID_TYPE"`
	Price         *int      `json:"price" validate:"omitnil" msg:"type=INVALID_TYPE"`
	CurrentStock  *int      `json:"currentStock" validate:"omitnil" msg:"type=INVALID_TYPE"`
	MinStockAlert *int      `json:"minStockAlert" validate:"omitnil" msg:"type=INVALID_TYPE"`
	ImageURL      *string   `json:"imageUrl" validate:"omitnil" msg:"type=INVALID_TYPE"`
	Allergens     *[]string `json:"allergens" validate:"omitnil,dive,oneof=GLUTEN CRUSTACEANS EGGS FISH PEANUTS SOYBEANS MILK NUTS CELERY MUSTARD SESAME SULPHITES LUPIN MOLLUSCS" msg:"oneof=INVALID_TYPE,type=INVALID_TYPE"`
	Icon          *string   `json:"icon" validate:"omitnil" msg:"type=INVALID_TYPE"`
	OwnTaxRate    *int      `json:"ownTaxRate" validate:"omitnil,min=0,max=10000" msg:"min=INVALID_TYPE,max=INVALID_TYPE,type=INVALID_TYPE"`
}

// updateProductRequest is UpdateProductDto.
type updateProductRequest struct {
	Name          *string   `json:"name" validate:"omitnil" msg:"type=INVALID_TYPE"`
	CategoryID    *string   `json:"categoryId" validate:"omitnil" msg:"type=INVALID_TYPE"`
	Price         *int      `json:"price" validate:"omitnil" msg:"type=INVALID_TYPE"`
	MinStockAlert *int      `json:"minStockAlert" validate:"omitnil,min=0" msg:"min=INVALID_TYPE,type=INVALID_TYPE"`
	ImageURL      *string   `json:"imageUrl" validate:"omitnil" msg:"type=INVALID_TYPE"`
	Allergens     *[]string `json:"allergens" validate:"omitnil,dive,oneof=GLUTEN CRUSTACEANS EGGS FISH PEANUTS SOYBEANS MILK NUTS CELERY MUSTARD SESAME SULPHITES LUPIN MOLLUSCS" msg:"oneof=INVALID_TYPE,type=INVALID_TYPE"`
	Icon          *string   `json:"icon" validate:"omitnil" msg:"type=INVALID_TYPE"`
	OwnTaxRate    *int      `json:"ownTaxRate" validate:"omitnil,min=0,max=10000" msg:"min=INVALID_TYPE,max=INVALID_TYPE,type=INVALID_TYPE"`
}

// updateStockRequest is UpdateProductStockDto.
type updateStockRequest struct {
	CurrentStock int `json:"currentStock" msg:"type=INVALID_TYPE"`
}

func (h *ProductHandler) list(w http.ResponseWriter, r *http.Request) {
	products, err := h.products.List(r.Context(), r.PathValue("establishmentId"))
	if err != nil {
		writeError(w, err)
		return
	}

	writeJSON(w, http.StatusOK, products)
}

func (h *ProductHandler) create(w http.ResponseWriter, r *http.Request) {
	var input createProductRequest
	if err := decodeJSON(r, &input); err != nil {
		writeError(w, err)
		return
	}

	var allergens []string
	if input.Allergens != nil {
		allergens = *input.Allergens
	}

	err := h.products.Create(r.Context(), r.PathValue("establishmentId"), service.CreateProductInput{
		Name:          input.Name,
		CategoryID:    input.CategoryID,
		Price:         input.Price,
		CurrentStock:  input.CurrentStock,
		MinStockAlert: input.MinStockAlert,
		ImageURL:      input.ImageURL,
		Icon:          input.Icon,
		Allergens:     allergens,
		OwnTaxRate:    input.OwnTaxRate,
	})
	if err != nil {
		writeError(w, err)
		return
	}

	w.WriteHeader(http.StatusCreated)
}

func (h *ProductHandler) update(w http.ResponseWriter, r *http.Request) {
	var input updateProductRequest
	nulls, err := decodeJSONWithNulls(r, &input)
	if err != nil {
		writeError(w, err)
		return
	}

	changes := domain.ProductChanges{
		Name:            input.Name,
		CategoryID:      input.CategoryID,
		Price:           input.Price,
		MinStockAlert:   input.MinStockAlert,
		ImageURL:        input.ImageURL,
		ClearImageURL:   nulls["imageUrl"],
		Icon:            input.Icon,
		ClearIcon:       nulls["icon"],
		OwnTaxRate:      input.OwnTaxRate,
		ClearOwnTaxRate: nulls["ownTaxRate"],
	}
	if input.Allergens != nil {
		changes.Allergens = *input.Allergens
	}

	if err := h.products.Update(r.Context(), r.PathValue("establishmentId"), r.PathValue("productId"), changes); err != nil {
		writeError(w, err)
		return
	}

	writeSuccess(w)
}

func (h *ProductHandler) updateStock(w http.ResponseWriter, r *http.Request) {
	var input updateStockRequest
	if err := decodeJSON(r, &input); err != nil {
		writeError(w, err)
		return
	}

	if err := h.products.SetStock(r.Context(), r.PathValue("establishmentId"), r.PathValue("productId"), input.CurrentStock); err != nil {
		writeError(w, err)
		return
	}

	writeSuccess(w)
}

func (h *ProductHandler) delete(w http.ResponseWriter, r *http.Request) {
	if err := h.products.Delete(r.Context(), r.PathValue("establishmentId"), r.PathValue("productId")); err != nil {
		writeError(w, err)
		return
	}

	writeSuccess(w)
}
