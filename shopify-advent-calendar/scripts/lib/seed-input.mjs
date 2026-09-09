export function toUpsertInput(entry, type) {
  return {
    handle: { type, handle: entry.handle },
    metaobject: {
      fields: Object.entries(entry.fields).map(([key, value]) => ({ key, value: String(value) })),
      capabilities: { publishable: { status: 'ACTIVE' } },
    },
  };
}

export function buildParentFields(baseFields, dayGids) {
  const fields = Object.entries(baseFields).map(([key, value]) => ({ key, value: String(value) }));
  fields.push({ key: 'days', value: JSON.stringify(dayGids) });
  return fields;
}
