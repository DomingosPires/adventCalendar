import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export const DAY_FIELD_KEYS = [
  'day', 'title', 'message', 'code', 'motif',
  'image', 'link_url', 'link_label', 'grid_area', 'grid_area_mobile',
];

export const CALENDAR_FIELD_KEYS = [
  'heading', 'subheading', 'background_type', 'background_color',
  'gradient_color_start', 'gradient_color_end', 'gradient_angle',
  'background_image', 'background_image_dim', 'text_color', 'door_color',
  'door_text_color', 'accent_color', 'show_snow', 'start_date', 'days',
];

export function loadDefinitions(dir) {
  const read = (name) => JSON.parse(readFileSync(join(dir, name), 'utf8'));
  return {
    day: read('advent_calendar_day.definition.json'),
    calendar: read('advent_calendar.definition.json'),
  };
}
