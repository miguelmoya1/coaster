package domain

import (
	"strconv"
	"strings"
	"testing"
	"time"
)

func aiCatalogue(size int) []Product {
	products := make([]Product, 0, size)
	for i := range size {
		products = append(products, Product{
			ID: "product-" + strconv.Itoa(i), Name: "Producto numero " + strconv.Itoa(i), Price: 250, CurrentStock: 40,
		})
	}
	return products
}

func TestFormatAIProductsListsACatalogueThatFits(t *testing.T) {
	list, omitted := FormatAIProducts(aiCatalogue(20), AIProductBudgetChars)

	if omitted || !strings.Contains(list, "Producto numero 0") {
		t.Errorf("FormatAIProducts(20) = %q, omitted %v", list, omitted)
	}
}

func TestFormatAIProductsDropsACatalogueThatDoesNotFit(t *testing.T) {
	list, omitted := FormatAIProducts(aiCatalogue(5000), AIProductBudgetChars)

	if !omitted || list != "" {
		t.Errorf("FormatAIProducts(5000) = %q, omitted %v; want nothing", list, omitted)
	}
}

func TestFormatAIProductsNeverExceedsItsBudget(t *testing.T) {
	for _, size := range []int{1, 50, 200, 1000} {
		list, _ := FormatAIProducts(aiCatalogue(size), AIProductBudgetChars)
		if utf16Length(list) > AIProductBudgetChars {
			t.Errorf("FormatAIProducts(%d) is %d long", size, utf16Length(list))
		}
	}
}

func TestFormatAIProductsWritesEurosLikeJavaScript(t *testing.T) {
	products := []Product{
		{ID: "p1", Name: "Caña", Price: 250, CurrentStock: 40},
		{ID: "p2", Name: "Café", Price: 7, CurrentStock: -2},
		{ID: "p3", Name: "Menú", Price: 1200, CurrentStock: 0},
		{ID: "p4", Name: "Vino", Price: 199, CurrentStock: 3},
	}

	list, _ := FormatAIProducts(products, AIProductBudgetChars)

	want := "- Caña: ID=p1, Price=2.5€, Stock=40\n" +
		"- Café: ID=p2, Price=0.07€, Stock=-2\n" +
		"- Menú: ID=p3, Price=12€, Stock=0\n" +
		"- Vino: ID=p4, Price=1.99€, Stock=3"
	if list != want {
		t.Errorf("FormatAIProducts =\n%s\nwant\n%s", list, want)
	}
}

func TestFormatAIProductsCountsTheBudgetInUTF16Units(t *testing.T) {
	products := []Product{{ID: "p", Name: "ñññ", Price: 100}}
	line := "- ñññ: ID=p, Price=1€, Stock=0"

	if _, omitted := FormatAIProducts(products, len([]rune(line))); omitted {
		t.Errorf("a list exactly as long as the budget (in UTF-16 units) was left out; its byte length is %d", len(line))
	}
	if _, omitted := FormatAIProducts(products, len([]rune(line))-1); !omitted {
		t.Error("a list one unit over the budget was kept")
	}
}

func TestFormatAIOrdersSummarisesAnOrderInsteadOfSpellingOutItsLines(t *testing.T) {
	tables := []Table{{ID: "table-1", Name: "Mesa 3"}}
	tableID := "table-1"
	order := func(items int) Order {
		return Order{ID: "order-1", TableID: &tableID, Items: make([]OrderItem, items)}
	}

	if line := FormatAIOrders([]Order{order(6)}, tables); line != "- Order ID=order-1 at Mesa 3 (6 items)" {
		t.Errorf("FormatAIOrders = %q", line)
	}
	if len(FormatAIOrders([]Order{order(3)}, tables)) != len(FormatAIOrders([]Order{order(9)}, tables)) {
		t.Error("the line of an order grows with its items")
	}
	if line := FormatAIOrders([]Order{order(1)}, tables); line != "- Order ID=order-1 at Mesa 3 (1 item)" {
		t.Errorf("FormatAIOrders with one item = %q", line)
	}

	withoutTable := order(1)
	withoutTable.TableID = nil
	if line := FormatAIOrders([]Order{withoutTable}, tables); !strings.Contains(line, "at No table") {
		t.Errorf("FormatAIOrders without a table = %q", line)
	}
}

func TestFormatAITablesAndCategories(t *testing.T) {
	tables := FormatAITables([]Table{
		{ID: "t1", Name: "Mesa 1", Status: TableFree},
		{ID: "t2", Name: "Terraza", Status: TableOccupied},
	})
	if want := "- Mesa 1: ID=t1, Status=FREE\n- Terraza: ID=t2, Status=OCCUPIED"; tables != want {
		t.Errorf("FormatAITables = %q, want %q", tables, want)
	}

	icon, empty := "local_bar", ""
	categories := FormatAICategories([]Category{
		{ID: "c1", Name: "Bebidas", Icon: &icon},
		{ID: "c2", Name: "Postres"},
		{ID: "c3", Name: "Vinos", Icon: &empty},
	})
	want := "- Bebidas: ID=c1, Icon=local_bar\n- Postres: ID=c2, Icon=(None)\n- Vinos: ID=c3, Icon=(None)"
	if categories != want {
		t.Errorf("FormatAICategories = %q, want %q", categories, want)
	}

	if FormatAITables(nil) != "" || FormatAICategories(nil) != "" || FormatAIOrders(nil, nil) != "" {
		t.Error("an empty list is not an empty string")
	}
}

func TestAIPeriodOfIsTheMonthInUTC(t *testing.T) {
	madrid, err := time.LoadLocation("Europe/Madrid")
	if err != nil {
		t.Fatal(err)
	}

	if period := AIPeriodOf(time.Date(2026, 10, 1, 1, 0, 0, 0, madrid)); period != "2026-09" {
		t.Errorf("AIPeriodOf(1 October 01:00 in Madrid) = %q, want 2026-09", period)
	}
}
