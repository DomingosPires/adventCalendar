function resolveValidations(validations, refIds) {
  if (!Array.isArray(validations)) return [];
  return validations.map((v) => {
    if (typeof v.value === 'string' && v.value.startsWith('@ref:')) {
      const key = v.value.slice(5);
      if (!refIds[key]) throw new Error(`Cannot resolve @ref:${key} — create that definition first.`);
      return { name: v.name, value: refIds[key] };
    }
    return { name: v.name, value: v.value };
  });
}

export function toDefinitionInput(def, refIds = {}) {
  const input = {
    type: def.type,
    name: def.name,
    fieldDefinitions: (def.fieldDefinitions || []).map((f) => ({
      key: f.key,
      name: f.name,
      type: f.type,
      required: Boolean(f.required),
      validations: resolveValidations(f.validations, refIds),
    })),
  };
  if (def.access) input.access = def.access;
  if (def.capabilities) input.capabilities = def.capabilities;
  if (def.displayNameKey) input.displayNameKey = def.displayNameKey;
  return input;
}
