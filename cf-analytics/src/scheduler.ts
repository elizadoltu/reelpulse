import * as functions from '@google-cloud/functions-framework';
import 'dotenv/config';
import { BigQuery } from '@google-cloud/bigquery';
import { VertexAI } from '@google-cloud/vertexai';
import { PubSub } from '@google-cloud/pubsub';

interface AnalyticsSnapshotEvent {
    trending: Array<{
        movieId: string;
        views: number;
    }>;
    genres: Array<string>;
    aiNarrative: string;
    activeUsers: number;
    latencyPercentiles: {
        p50: number;
        p95: number;
        p99: number;
    };
}

const bq = new BigQuery({
    projectId: process.env.GCP_PROJECT_ID,
});

const pubsub = new PubSub({
    projectId: process.env.GCP_PROJECT_ID,
});

const vertexAI = new VertexAI({project: process.env.GCP_PROJECT_ID, location: 'europe-west1'})
const generativeModel = vertexAI.getGenerativeModel({
    model: 'gemini-2.5-flash'
})

const datasetId = process.env.BIGQUERY_DATASET || 'reelpulse';
const tableId = process.env.BIGQUERY_TABLE || 'movie_views';

const query = `
    SELECT 
        movieId,
        genre,
        COUNT(*) AS views
    FROM \`${datasetId}.${tableId}\`
    WHERE
        timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 1 DAY)
    GROUP BY movieId, genre
    ORDER BY views DESC
    LIMIT 10
`

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const schedulerHandler = async (req: functions.Request, res: functions.Response) => {
    res.set('Access-Control-Allow-Origin', '*');

    if (req.method === 'OPTIONS') {
        res.status(204).send('');
        return;
    }

    try {
        const [rows] = await bq.query({ query });

        if (rows.length === 0) {
            return res.status(200).json({ narrative: "No movie data found for the last 24 hours." });
        }

        let genres = new Set<string>();
        let topMovies = new Set<{ movieId: string; views: number }>();
        const dataSummary = rows.map((row: any) => `${row.movieId} (${row.genre}): ${row.views} views`).join(', ');
        for (const row of rows) {
            let genreList = row.genre.split(',').map((g: string) => g.trim());
            for (const genre of genreList) {
                genres.add(genre);
            }
            topMovies.add({
                movieId: row.movieId,
                views: row.views
            });
        }

        const prompt = `
            You are a movie industry analyst. Based on the following viewing data from the last 24 hours, 
      write a short and engaging "Trending Narrative" (max 3 sentences). 
      Identify the top movie and the dominant genre trend.
      
      Data:
      ${dataSummary}
        `

        const result = await generativeModel.generateContent(prompt);
        const response = result.response;
        const narrative = response.candidates?.[0].content.parts[0].text

        res.status(200).json({ narrative });
    } catch (error) {
        console.error('Error generating narrative:', error);
        res.status(500).json({ error: 'Failed to generate narrative' });
    }
}

export const scheduler = functions.http('scheduler', schedulerHandler);