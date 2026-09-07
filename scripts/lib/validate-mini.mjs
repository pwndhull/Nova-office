// SPDX-License-Identifier: MPL-2.0
// Compact JSON-Schema validator — supports only the keywords used by
// product/schema/product.schema.json: type, required, properties,
// additionalProperties (bool | schema), minLength, minProperties, pattern,
// const, $schema/$id/title/description (ignored).

export function validate(schema, data, path = "$") {
  const errors = [];
  const t = schema.type;
  const typeOf = (v) =>
    v === null ? "null" : Array.isArray(v) ? "array" : typeof v;

  if (t && typeOf(data) !== t) {
    errors.push(`${path}: expected ${t}, got ${typeOf(data)}`);
    return errors;
  }
  if ("const" in schema && data !== schema.const) {
    errors.push(`${path}: must equal ${JSON.stringify(schema.const)}`);
  }
  if (t === "string") {
    if (schema.minLength != null && data.length < schema.minLength)
      errors.push(`${path}: shorter than ${schema.minLength}`);
    if (schema.pattern && !new RegExp(schema.pattern).test(data))
      errors.push(`${path}: does not match /${schema.pattern}/ (got ${JSON.stringify(data)})`);
  }
  if (t === "object" || (!t && typeOf(data) === "object")) {
    const props = schema.properties || {};
    const keys = Object.keys(data || {});
    for (const req of schema.required || [])
      if (!(req in data)) errors.push(`${path}: missing required "${req}"`);
    if (schema.minProperties != null && keys.length < schema.minProperties)
      errors.push(`${path}: needs >= ${schema.minProperties} properties`);
    for (const k of keys) {
      if (props[k]) errors.push(...validate(props[k], data[k], `${path}.${k}`));
      else if (schema.additionalProperties === false)
        errors.push(`${path}: unexpected property "${k}"`);
      else if (schema.additionalProperties && typeof schema.additionalProperties === "object")
        errors.push(...validate(schema.additionalProperties, data[k], `${path}.${k}`));
    }
  }
  return errors;
}
