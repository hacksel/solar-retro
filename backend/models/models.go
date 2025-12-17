package models

type DecorationType string

const (
	TypeBright DecorationType = "bright"
	TypeBlack  DecorationType = "black"
	TypeGift   DecorationType = "gift"
	TypeStar   DecorationType = "star"
)

type Position struct {
	X float64 `json:"x"`
	Y float64 `json:"y"`
}

type Decoration struct {
	ID        string         `json:"id" dynamodbav:"DecorationID"`
	RoomID    string         `json:"roomId" dynamodbav:"RoomID"` // Partition Key
	Type      DecorationType `json:"type" dynamodbav:"Type"`
	Message   string         `json:"message" dynamodbav:"Message"`
	Position  Position       `json:"position" dynamodbav:"Position"`
	Author    string         `json:"author" dynamodbav:"Author"`
	CreatedAt int64          `json:"createdAt" dynamodbav:"CreatedAt"`
}

type BroadcastMessage struct {
	Type    string      `json:"type"`
	Payload interface{} `json:"payload"`
}

type UserSession struct {
	Nickname    string `json:"nickname"`
	Mood        string `json:"mood"`
	MoodMessage string `json:"moodMessage"`
}

type WSIncomingMessage struct {
	Action       string     `json:"action"` // "create", "update", "delete"
	Decoration   Decoration `json:"decoration"`
	DecorationID string     `json:"decorationId"`
}
