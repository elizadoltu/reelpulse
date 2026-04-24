import * as functions from '@google-cloud/functions-framework';
import 'dotenv/config';
import { BigQuery } from '@google-cloud/bigquery';

const bq = new BigQuery({
  projectId: process.env.GCP_PROJECT_ID,
});
const datasetId = process.env.BIGQUERY_DATASET || 'reelpulse';
const tableId = process.env.BIGQUERY_TABLE || 'movie_views';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const analyticsProcessorHandler = async (cloudEvent: any) => {
  const base64Data = cloudEvent.data.message.data;
  const payloadString = Buffer.from(base64Data, 'base64').toString();
  const eventData = JSON.parse(payloadString);

  const eventId = eventData.eventId;

  const query = `SELECT 1 FROM \`${datasetId}.${tableId}\` WHERE sessionId = @eventId LIMIT 1`;
  const options = {
    query: query,
    params: { eventId },
  };

  const row = {
    sessionId: eventData.eventId,
    movieId: eventData.movieId,
    userId: eventData.userId || 'none',
    genre: Array.isArray(eventData.genre) ? eventData.genre.join(', ') : '-',
    timestamp: new Date(eventData.timestamp)
  };

  try {
    const [rows] = await bq.query(options);
    
    if (rows && rows.length > 0) {
      console.log(`Event ${row.sessionId} already exists in BigQuery, skipping.`);
      return;
    }

    await bq.dataset(datasetId).table(tableId).insert([row]);
    console.log(`Inserted event ${row.sessionId} into BigQuery`);
  } catch (error) {
    console.error(`Error processing event ${row.sessionId}:`, error);
  }
}

functions.cloudEvent('analyticsprocessor', analyticsProcessorHandler);