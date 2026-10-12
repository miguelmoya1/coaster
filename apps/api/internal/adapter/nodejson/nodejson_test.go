package nodejson

import "testing"

func TestMarshalWritesWhatJSONStringifyWrites(t *testing.T) {
	got, err := Marshal(map[string]string{"name": "<b>Tom & Jerry</b>"})
	if err != nil {
		t.Fatal(err)
	}

	if want := `{"name":"<b>Tom & Jerry</b>"}`; string(got) != want {
		t.Errorf("Marshal = %s, want %s", got, want)
	}
}
