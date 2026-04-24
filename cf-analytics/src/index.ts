import * as functions from '@google-cloud/functions-framework';
import 'dotenv/config';
import { BigQuery } from '@google-cloud/bigquery';

const bq = new BigQuery({
  projectId: process.env.GCP_PROJECT_ID,
});
const datasetId = process.env.BIGQUERY_DATASET || 'reelpulse';
const tableId = process.env.BIGQUERY_TABLE || 'movie_views';

export const analyticsProcessorHandler = async (cloudEvent: any) => {
  const base64Data = cloudEvent.data.message.data;
  const payloadString = Buffer.from(base64Data, 'base64').toString();
  const eventData = JSON.parse(payloadString);

  console.log(eventData);

  const row = {
    sessionId: eventData.eventId,
    movieId: eventData.movieId,
    userId: eventData.userId || 'none',
    genre: Array.isArray(eventData.genre) ? eventData.genre.join(', ') : '-',
    timestamp: new Date(eventData.timestamp)
  };

  try {
    await bq.dataset(datasetId).table(tableId).insert(row);
    console.log(`Inserted event ${row.sessionId} into BigQuery`);
  } catch (error) {
    console.error(`Error inserting event ${row.sessionId} into BigQuery:`, error);
  }
}

functions.cloudEvent('analyticsprocessor', analyticsProcessorHandler);
