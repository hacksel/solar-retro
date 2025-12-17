package db

import (
	"context"
	"log"
	"solar-retro/backend/models"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/feature/dynamodb/attributevalue"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb/types"
)

var svc *dynamodb.Client

const TableName = "SolarRetroDecorations"

func Init() {
	cfg, err := config.LoadDefaultConfig(context.TODO())
	if err != nil {
		log.Fatalf("unable to load SDK config, %v", err)
	}

	svc = dynamodb.NewFromConfig(cfg)
}

// Simple in-memory fallback
var memoryStore = []models.Decoration{}

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

	item, err := attributevalue.MarshalMap(d)
	if err != nil {
		return err
	}

	_, err = svc.PutItem(context.TODO(), &dynamodb.PutItemInput{
		TableName: aws.String(TableName),
		Item:      item,
	})
	return err
}

func DeleteDecoration(id string, roomID string) error {
	// Delete from memory store
	for i, existing := range memoryStore {
		if existing.ID == id {
			// Fast delete from slice
			memoryStore[i] = memoryStore[len(memoryStore)-1]
			memoryStore = memoryStore[:len(memoryStore)-1]
			break
		}
	}

	// Delete from DynamoDB
	_, err := svc.DeleteItem(context.TODO(), &dynamodb.DeleteItemInput{
		TableName: aws.String(TableName),
		Key: map[string]types.AttributeValue{
			"RoomID":       &types.AttributeValueMemberS{Value: roomID},
			"DecorationID": &types.AttributeValueMemberS{Value: id},
		},
	})
	return err
}

func GetAllDecorations(roomID string) ([]models.Decoration, error) {
	// For now, simpler scan or query. Since we use RoomID as PartitionKey, we should Query.
	// However, we need to design the keys carefully.
	// Plan: PK=RoomID, SK=DecorationID

	out, err := svc.Query(context.TODO(), &dynamodb.QueryInput{
		TableName:              aws.String(TableName),
		KeyConditionExpression: aws.String("RoomID = :rid"),
		ExpressionAttributeValues: map[string]types.AttributeValue{
			":rid": &types.AttributeValueMemberS{Value: roomID},
		},
	})

	// If DB fails (e.g. no creds), return memory store
	if err != nil {
		log.Printf("DynamoDB error (using memory fallback): %v", err)
		return memoryStore, nil
	}

	var decorations []models.Decoration
	err = attributevalue.UnmarshalListOfMaps(out.Items, &decorations)
	return decorations, err
}
