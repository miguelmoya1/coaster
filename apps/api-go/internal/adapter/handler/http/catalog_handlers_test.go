package http

import (
	"context"
	"net/http"
	"reflect"
	"strings"
	"testing"
	"time"

	"api-go/internal/adapter/handler/middleware"
	"api-go/internal/core/domain"
	"api-go/internal/core/ports"
	"api-go/internal/service"
)

type catalogAccess struct {
	modules []domain.EstablishmentModule
}

func (catalogAccess) UserRole(context.Context, string) (domain.Role, error) {
	return domain.RoleAdmin, nil
}
func (catalogAccess) Membership(context.Context, string, string) (*domain.Membership, error) {
	return nil, nil
}
func (a catalogAccess) EnabledModules(context.Context, string) ([]domain.EstablishmentModule, error) {
	return a.modules, nil
}
func (catalogAccess) SubscriptionActive(context.Context, string) (bool, error) { return true, nil }

type catalogStorage struct {
	contentType string
}

func (s *catalogStorage) SignUploadURL(_ context.Context, _ string, contentType string, _ map[string]string, _ time.Time) (string, error) {
	s.contentType = contentType
	return "https://signed.example/upload", nil
}

func (s *catalogStorage) PublicURL(objectPath string) string {
	return "https://storage.example/" + objectPath
}

type catalogMenus struct {
	ports.MenuRepository
}

func (catalogMenus) FindPublishedBySlug(context.Context, string) (*domain.PublishedMenuPage, error) {
	return nil, nil
}

func newCatalogServer(modules []domain.EstablishmentModule, storage *catalogStorage) http.Handler {
	guard := middleware.NewGuard(fakeTokens{}, catalogAccess{modules: modules}, &countingLimiter{hits: map[string]int{}}, 1)
	mux := http.NewServeMux()
	NewCategoryHandler(service.NewCategoryService(nil, nil)).RegisterRoutes(mux, guard)
	NewProductHandler(service.NewProductService(nil, nil)).RegisterRoutes(mux, guard)
	NewCatalogueHandler(service.NewCatalogueService(nil, nil)).RegisterRoutes(mux, guard)
	NewMenuHandler(service.NewMenuService(catalogMenus{})).RegisterRoutes(mux, guard)
	NewMediaHandler(service.NewMediaService(storage)).RegisterRoutes(mux, guard)
	return mux
}

func TestCatalogRoutesNeedTheInventoryModule(t *testing.T) {
	server := newCatalogServer([]domain.EstablishmentModule{domain.ModuleTimeTracking}, &catalogStorage{})
	signedIn := map[string]string{"Authorization": "Bearer good"}

	routes := []string{
		"GET /api/v1/establishments/e1/categories",
		"POST /api/v1/establishments/e1/categories",
		"PATCH /api/v1/establishments/e1/categories/c1",
		"DELETE /api/v1/establishments/e1/categories/c1",
		"GET /api/v1/establishments/e1/products",
		"POST /api/v1/establishments/e1/products",
		"PATCH /api/v1/establishments/e1/products/p1",
		"PATCH /api/v1/establishments/e1/products/p1/stock",
		"DELETE /api/v1/establishments/e1/products/p1",
		"GET /api/v1/establishments/e1/catalogue",
		"POST /api/v1/establishments/e1/catalogue/import",
		"GET /api/v1/establishments/e1/menu",
		"PUT /api/v1/establishments/e1/menu",
		"POST /api/v1/establishments/e1/menu/publish",
		"POST /api/v1/establishments/e1/menu/unpublish",
	}

	for _, route := range routes {
		method, target, _ := strings.Cut(route, " ")

		if response := send(server, method, target, "", nil); response.Code != http.StatusUnauthorized {
			t.Errorf("%s without a token = %d", route, response.Code)
		}

		response := send(server, method, target, "", signedIn)
		want := `{"message":"MODULE_NOT_ENABLED","error":"Forbidden","statusCode":403}`
		if response.Code != http.StatusForbidden || response.Body.String() != want {
			t.Errorf("%s without inventory = %d %s", route, response.Code, response.Body)
		}
	}
}

func TestCatalogValidation(t *testing.T) {
	server := newCatalogServer(domain.AllEstablishmentModules, &catalogStorage{})
	signedIn := map[string]string{"Authorization": "Bearer good"}

	tests := []struct {
		name   string
		route  string
		body   string
		want   string
		status int
	}{
		{name: "category without a name", route: "POST /api/v1/establishments/e1/categories", body: `{"name":""}`,
			want: `{"message":["REQUIRED"],"error":"Bad Request","statusCode":400}`},
		{name: "category tax rate out of range", route: "POST /api/v1/establishments/e1/categories", body: `{"name":"Drinks","taxRate":20000}`,
			want: `{"message":["INVALID_TYPE"],"error":"Bad Request","statusCode":400}`},
		{name: "category update without a name", route: "PATCH /api/v1/establishments/e1/categories/c1", body: `{"icon":null}`,
			want: `{"message":["REQUIRED"],"error":"Bad Request","statusCode":400}`},
		{name: "product without a name", route: "POST /api/v1/establishments/e1/products", body: `{"categoryId":"8a6e0804-2bd0-4672-b79d-d97027f9071a"}`,
			want: `{"message":["REQUIRED"],"error":"Bad Request","statusCode":400}`},
		{name: "product category that is not a UUID", route: "POST /api/v1/establishments/e1/products", body: `{"name":"Beer","categoryId":"nope"}`,
			want: `{"message":["INVALID_TYPE"],"error":"Bad Request","statusCode":400}`},
		{name: "unknown allergen", route: "PATCH /api/v1/establishments/e1/products/p1", body: `{"allergens":["GLUTEN","PINEAPPLE"]}`,
			want: `{"message":["INVALID_TYPE"],"error":"Bad Request","statusCode":400}`},
		{name: "negative minimum stock", route: "PATCH /api/v1/establishments/e1/products/p1", body: `{"minStockAlert":-1}`,
			want: `{"message":["INVALID_TYPE"],"error":"Bad Request","statusCode":400}`},
		{name: "stock missing", route: "PATCH /api/v1/establishments/e1/products/p1/stock", body: `{}`,
			want: `{"message":["INVALID_TYPE"],"error":"Bad Request","statusCode":400}`},
		{name: "catalogue keys that are not text", route: "POST /api/v1/establishments/e1/catalogue/import", body: `{"categoryKeys":[1]}`,
			want: `{"message":["each value in categoryKeys must be a string"],"error":"Bad Request","statusCode":400}`},
		{name: "menu with no languages", route: "PUT /api/v1/establishments/e1/menu", body: `{"name":"Carta","languages":[],"sections":[]}`,
			want: `{"message":["languages should not be empty"],"error":"Bad Request","statusCode":400}`},
		{name: "menu in an unknown language", route: "PUT /api/v1/establishments/e1/menu", body: `{"name":"Carta","languages":["de"],"sections":[]}`,
			want: `{"message":["each value in languages must be one of the following values: es, en"],"error":"Bad Request","statusCode":400}`},
		{name: "menu line with a negative price", route: "PUT /api/v1/establishments/e1/menu",
			body: `{"name":"Carta","languages":["es"],"sections":[{"translations":{},"items":[{"price":-1,"translations":{}}]}]}`,
			want: `{"message":["sections.0.items.0.price must not be less than 0"],"error":"Bad Request","statusCode":400}`},
		{name: "menu section without translations", route: "PUT /api/v1/establishments/e1/menu",
			body: `{"name":"Carta","languages":["es"],"sections":[{"items":[]}]}`,
			want: `{"message":["sections.0.translations must be an object"],"error":"Bad Request","statusCode":400}`},
		{name: "no files to upload", route: "POST /api/v1/establishments/e1/media/upload-urls", body: `{"entityType":"products","files":[]}`,
			want: `{"message":["REQUIRED"],"error":"Bad Request","statusCode":400}`},
		{name: "an upload that is not an image", route: "POST /api/v1/establishments/e1/media/upload-urls",
			body: `{"entityType":"products","files":[{"filename":"a.pdf","contentType":"application/pdf"}]}`,
			want: `{"message":["files.0.INVALID_TYPE"],"error":"Bad Request","statusCode":400}`},
		{name: "an unknown folder", route: "POST /api/v1/establishments/e1/media/upload-urls",
			body: `{"entityType":"secrets","files":[{"filename":"a.png","contentType":"image/png"}]}`,
			want: `{"message":["INVALID_TYPE"],"error":"Bad Request","statusCode":400}`},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			method, target, _ := strings.Cut(tt.route, " ")

			response := send(server, method, target, tt.body, signedIn)
			if response.Code != http.StatusBadRequest || response.Body.String() != tt.want {
				t.Errorf("%s = %d %s\nwant %s", tt.route, response.Code, response.Body, tt.want)
			}
		})
	}
}

func TestMediaHandlerNormalisesTheContentType(t *testing.T) {
	storage := &catalogStorage{}
	server := newCatalogServer(nil, storage)

	response := send(server, "POST", "/api/v1/establishments/e1/media/upload-urls",
		`{"entityType":"products","files":[{"filename":"beer.PNG","contentType":" IMAGE/PNG "}]}`,
		map[string]string{"Authorization": "Bearer good"})

	if response.Code != http.StatusCreated {
		t.Fatalf("status = %d %s", response.Code, response.Body)
	}
	if storage.contentType != "image/png" {
		t.Errorf("signed for %q, want image/png", storage.contentType)
	}
	if !strings.Contains(response.Body.String(), `"uploadUrl":"https://signed.example/upload"`) ||
		!strings.Contains(response.Body.String(), `"uploadHeaders":{"x-goog-content-length-range":"0,5242880"}`) {
		t.Errorf("body = %s", response.Body)
	}
}

func TestPublicMenuRouteIsOpenAndThrottled(t *testing.T) {
	server := newCatalogServer(nil, &catalogStorage{})

	for i := range 60 {
		response := send(server, "GET", "/api/v1/menus/bar-pepe?lang=en", "", nil)
		want := `{"message":"MENU_NOT_FOUND","error":"Not Found","statusCode":404}`
		if response.Code != http.StatusNotFound || response.Body.String() != want {
			t.Fatalf("read %d without a token = %d %s", i+1, response.Code, response.Body)
		}
	}

	if response := send(server, "GET", "/api/v1/menus/bar-pepe", "", nil); response.Code != http.StatusTooManyRequests {
		t.Errorf("the 61st read in a minute = %d, want 429", response.Code)
	}
}

func TestDecodeJSONWithNulls(t *testing.T) {
	server := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		var input updateProductRequest
		nulls, err := decodeJSONWithNulls(r, &input)
		if err != nil {
			writeError(w, err)
			return
		}
		writeJSON(w, http.StatusOK, nulls)
	})

	tests := []struct {
		body string
		want string
	}{
		{body: `{"ownTaxRate":null,"imageUrl":"x","icon":null}`, want: `{"icon":true,"ownTaxRate":true}`},
		{body: `{"name":"Beer"}`, want: `{}`},
		{body: ``, want: `{}`},
	}

	for _, tt := range tests {
		response := send(server, "PATCH", "/", tt.body, nil)
		if response.Code != http.StatusOK || response.Body.String() != tt.want {
			t.Errorf("body %q → %d %s, want %s", tt.body, response.Code, response.Body, tt.want)
		}
	}
}

func TestCatalogRequestListsMatchTheDomain(t *testing.T) {
	oneOf := func(structType reflect.Type, field, rule string) []string {
		f, _ := structType.FieldByName(field)
		for part := range strings.SplitSeq(f.Tag.Get("validate"), ",") {
			if values, found := strings.CutPrefix(part, rule+"="); found {
				return strings.Fields(values)
			}
		}
		return nil
	}

	checks := []struct {
		name string
		got  []string
		want []string
	}{
		{"create allergens", oneOf(reflect.TypeFor[createProductRequest](), "Allergens", "oneof"), domain.Allergens},
		{"update allergens", oneOf(reflect.TypeFor[updateProductRequest](), "Allergens", "oneof"), domain.Allergens},
		{"media folders", oneOf(reflect.TypeFor[uploadURLsRequest](), "EntityType", "oneof"), domain.MediaEntityTypes},
		{"media types", oneOf(reflect.TypeFor[mediaFileRequest](), "ContentType", "oneofci"), domain.MediaImageTypes},
		{"menu languages", oneOf(reflect.TypeFor[saveMenuDraftRequest](), "Languages", "oneof"), domain.Languages},
	}

	for _, check := range checks {
		if !reflect.DeepEqual(check.got, check.want) {
			t.Errorf("%s = %v, want %v", check.name, check.got, check.want)
		}
	}
}
