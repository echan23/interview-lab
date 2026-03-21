package postgres

import (
	"context"
	"errors"
	"fmt"
	"log"
	"os"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

var DB *pgxpool.Pool

func Init() {
	url := fmt.Sprintf("postgres://%s:%s@%s:%s/%s",
		os.Getenv("PG_USER"),
		os.Getenv("PG_PASSWORD"),
		os.Getenv("PG_HOST"),
		os.Getenv("PG_PORT"),
		os.Getenv("PG_DB"),
	)

	pool, err := pgxpool.New(context.Background(), url)
	if err != nil {
		log.Fatal("Postgres connection failed")
	}
	log.Println("Connected to Postgres")
	DB = pool
}

var ErrRoomNotFound = errors.New("Room not found in Postgres")

func SaveToDB(ctx context.Context, roomID string, content string, editTime time.Time) error {
	query := `INSERT INTO codefiles(roomID, content, last_edited)
				VALUES($1, $2, $3)
				ON CONFLICT (roomID) DO UPDATE
				SET content = EXCLUDED.content,
					last_edited = EXCLUDED.last_edited;`
	_, err := DB.Exec(ctx, query, roomID, content, editTime)
	return err
}

func RetrieveContent(ctx context.Context, roomID string) (string, error) {
	query := `SELECT content FROM codefiles WHERE roomID = $1`

	var content string
	err := DB.QueryRow(ctx, query, roomID).Scan(&content)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return "", ErrRoomNotFound
		}
		return "", fmt.Errorf("Failed to retrieve content from Postgres  %s: %w", roomID, err)
	}
	return content, nil
}
