package types

type IRange struct {
	EndColumn       int `json:"endColumn"`
	EndLineNumber   int `json:"endLineNumber"`
	StartColumn     int `json:"startColumn"`
	StartLineNumber int `json:"startLineNumber"`
}

type Edit struct {
	Range       IRange `json:"range"`
	RangeLength int    `json:"rangeLength"`
	RangeOffset int    `json:"rangeOffset"`
	Text        string `json:"text"`
}

type Broadcast struct {
	Sender  string
	Message []Edit
}

type RedisEnvelope struct {
	Origin string
	Edits  []Edit
}
