function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function makeIdsUnique(doc: Document, suffix: string) {
  const elementsWithId = doc.querySelectorAll('[id]');
  const idMap = new Map<string, string>();
  const safeSuffix = suffix.replace(/[^a-zA-Z0-9]/g, '_');

  elementsWithId.forEach((element) => {
    const originalId = element.getAttribute('id');
    if (!originalId) return;
    const uniqueId = `${originalId}_model_${safeSuffix}`;
    idMap.set(originalId, uniqueId);
    element.setAttribute('id', uniqueId);
  });

  const refAttributes = ['clip-path', 'mask', 'fill', 'stroke', 'xlink:href', 'href'];
  doc.querySelectorAll('*').forEach((element) => {
    refAttributes.forEach((attr) => {
      const value = element.getAttribute(attr);
      if (!value) return;

      let nextValue = value;
      idMap.forEach((uniqueId, originalId) => {
        const escapedOriginalId = escapeRegExp(originalId);
        nextValue = nextValue.replace(new RegExp(`url\\(#${escapedOriginalId}\\)`, 'g'), `url(#${uniqueId})`);
        if (nextValue === `#${originalId}`) nextValue = `#${uniqueId}`;
      });

      if (nextValue !== value) element.setAttribute(attr, nextValue);
    });
  });
}
