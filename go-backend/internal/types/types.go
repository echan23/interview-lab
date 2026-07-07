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

type StopwatchEvent struct {
	EventTime int64  `json:"eventTime"`
	EventType string `json:"eventType"`
	Origin    string `json:"origin"`
}

type QuestionEvent struct {
	Value  string `json:"value"`
	Origin string `json:"origin"`
}

type StopwatchState struct {
	StartTime   int64 `json:"startTime"`
	Running     bool  `json:"running"`
	ElapsedTime int64 `json:"elapsedTime"`
}
