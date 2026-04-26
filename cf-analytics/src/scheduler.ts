import * as functions from '@google-cloud/functions-framework';
import 'dotenv/config';
import { BigQuery } from '@google-cloud/bigquery';
import { VertexAI } from '@google-cloud/vertexai';
import { PubSub } from '@google-cloud/pubsub';
import { MetricServiceClient } from '@google-cloud/monitoring';

interface AnalyticsSnapshotEvent {
    type: string;
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

async function getLatencyPercentiles(): Promise<{ p50: number; p95: number; p99: number }> {
    const monitoringClient = new MetricServiceClient({
        projectId: process.env.GCP_PROJECT_ID,
    });
    const now = Date.now() / 1000;

    try {
        const [timeSeries] = await monitoringClient.listTimeSeries({
            name: `projects/${process.env.GCP_PROJECT_ID}`,
            filter: 'metric.type="cloudfunctions.googleapis.com/function/execution_times" AND resource.type="cloud_function"',
            interval: {
                startTime: { seconds: Math.floor(now - 3600) },
                endTime: { seconds: Math.floor(now) },
            },
            aggregation: {
                alignmentPeriod: { seconds: 3600 },
                perSeriesAligner: 'ALIGN_PERCENTILE_95'
            }
        });
        
        console.log(timeSeries);

        const firstPoint = timeSeries[0]?.points?.[0]?.value;

        const p95Value = firstPoint?.doubleValue 
            ? firstPoint.doubleValue / 1_000_000 
            : 0;
        return {
            p50: p95Value * 0.6,
            p95: Math.round(p95Value),
            p99: Math.round(p95Value * 1.4)
        };
    } catch (err) {
        console.error("Failed to fetch metrics:", err);
        return { p50: 0, p95: 0, p99: 0 };
    }
}


const bq = new BigQuery({
    projectId: process.env.GCP_PROJECT_ID,
});

const pubsub = new PubSub({
    projectId: process.env.GCP_PROJECT_ID,
});

const vertexAI = new VertexAI({ project: process.env.GCP_PROJECT_ID, location: 'europe-west1' })
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

        const latencyPercentiles = await getLatencyPercentiles();

        console.log(latencyPercentiles);

        let eventData: AnalyticsSnapshotEvent
        if (rows.length === 0) {
            eventData = {
                type: 'ANALYTICS_UPDATE',
                trending: [],
                genres: [],
                aiNarrative: "No movie data found for the last 24 hours.",
                activeUsers: 0,
                latencyPercentiles: {
                    p50: latencyPercentiles.p50,
                    p95: latencyPercentiles.p95,
                    p99: latencyPercentiles.p99
                }
            };
            res.status(200).json({ message: 'Analytics snapshot generated and published successfully', eventData });
        } else {
            const genres = new Set<string>();
            const topMovies = new Set<{ movieId: string; views: number }>();
            const dataSummary = rows.map((row) => `${row.movieId} (${row.genre}): ${row.views} views`).join(', ');
            for (const row of rows) {
                const genreList = row.genre.split(',').map((g: string) => g.trim());
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

            eventData = {
                type: 'ANALYTICS_UPDATE',
                trending: Array.from(topMovies),
                genres: Array.from(genres),
                aiNarrative: narrative || "No movie data found for the last 24 hours.",
                activeUsers: 0, // PLACEHOLDERS, o sa le bag maine ig (sau luam nr de conexiuni la WS)
                latencyPercentiles: {
                    p50: latencyPercentiles.p50,
                    p95: latencyPercentiles.p95,
                    p99: latencyPercentiles.p99
                }
            }
        }

        const messageBuffer = Buffer.from(JSON.stringify(eventData));
        await pubsub.topic('review-processed').publishMessage({ data: messageBuffer });

        res.status(200).json({ message: 'Analytics snapshot generated and published successfully', eventData });
    } catch (error) {
        console.error('Error generating narrative:', error);
        res.status(500).json({ error: 'Failed to generate narrative' });
    }
}

export const scheduler = functions.http('scheduler', schedulerHandler);