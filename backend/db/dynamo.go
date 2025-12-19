package db

import (
	"context"
	"encoding/json"
	"log"
	"os"
	"solar-retro/backend/models"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/feature/dynamodb/attributevalue"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb/types"
)

var svc *dynamodb.Client
var TableName string

const LocalFileName = "decorations.json"

func Init() {
	// 1. Always try to load existing local memory store from file
	loadFromLocalFile()

	// 2. Setup DynamoDB if configured
	TableName = os.Getenv("DYNAMODB_TABLE_NAME")
	if TableName == "" {
		log.Println("DYNAMODB_TABLE_NAME not set. Running in LOCAL-FILE persistence mode.")
		return
	}

	cfg, err := config.LoadDefaultConfig(context.TODO())
	if err != nil {
		log.Printf("unable to load SDK config (using local file only), %v", err)
		TableName = ""
		return
	}

	svc = dynamodb.NewFromConfig(cfg)
	log.Printf("DynamoDB initialized with table: %s", TableName)
}

// Simple in-memory storage
var memoryStore = []models.Decoration{}

func loadFromLocalFile() {
	data, err := os.ReadFile(LocalFileName)
	if err != nil {
		if !os.IsNotExist(err) {
			log.Printf("Error reading %s: %v", LocalFileName, err)
		}
		return
	}
	err = json.Unmarshal(data, &memoryStore)
	if err != nil {
		log.Printf("Error parsing %s: %v", LocalFileName, err)
		return
	}
	log.Printf("Loaded %d decorations from %s", len(memoryStore), LocalFileName)
}

func saveToLocalFile() {
	data, err := json.MarshalIndent(memoryStore, "", "  ")
	if err != nil {
		log.Printf("Error marshaling decorations: %v", err)
		return
	}
	err = os.WriteFile(LocalFileName, data, 0644)
	if err != nil {
		log.Printf("Error writing %s: %v", LocalFileName, err)
	}
}

func SaveDecoration(d models.Decoration) error {
	// Upsert to memory store
	found := false
	for i, existing := range memoryStore {
		if existing.ID == d.ID {
			memoryStore[i] = d
			found = true
			break
		}
	}
	if !found {
		memoryStore = append(memoryStore, d)
	}

	// Persist locally
	saveToLocalFile()

	if TableName == "" {
		return nil
	}

	item, err := attributevalue.MarshalMap(d)
	if err != nil {
		return err
	}

	_, err = svc.PutItem(context.TODO(), &dynamodb.PutItemInput{
		TableName: aws.String(TableName),
		Item:      item,
	})
	if err != nil {
		log.Printf("DynamoDB PutItem error (continuing with local file): %v", err)
	}
	return nil
}

func DeleteDecoration(id string, roomID string) error {
	// Delete from memory store
	for i, existing := range memoryStore {
		if existing.ID == id {
			memoryStore = append(memoryStore[:i], memoryStore[i+1:]...)
			break
		}
	}

	// Persist locally
	saveToLocalFile()

	if TableName == "" {
		return nil
	}

	// Delete from DynamoDB
	_, err := svc.DeleteItem(context.TODO(), &dynamodb.DeleteItemInput{
		TableName: aws.String(TableName),
		Key: map[string]types.AttributeValue{
			"ID": &types.AttributeValueMemberS{Value: id},
		},
	})
	if err != nil {
		log.Printf("DynamoDB DeleteItem error: %v", err)
	}
	return nil
}

func GetAllDecorations(roomID string) ([]models.Decoration, error) {
	if TableName == "" {
		return memoryStore, nil
	}

	// If DynamoDB is active, try to sync
	out, err := svc.Scan(context.TODO(), &dynamodb.ScanInput{
		TableName: aws.String(TableName),
	})

	if err != nil {
		log.Printf("DynamoDB error (returning local data): %v", err)
		return memoryStore, nil
	}

	var decorations []models.Decoration
	err = attributevalue.UnmarshalListOfMaps(out.Items, &decorations)
	if err != nil {
		return memoryStore, nil
	}

	memoryStore = decorations
	saveToLocalFile() // Keep local file in sync with cloud
	return decorations, nil
}
