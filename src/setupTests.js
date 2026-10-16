// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

// jsdom has no layout engine; ProseMirror (TipTap) measures selection rects when it
// scrolls the cursor into view on a later animation frame.
const emptyRect = () => ({ x: 0, y: 0, top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0, toJSON() {} });
const emptyRectList = () => Object.assign([], { item: () => null });

[window.Range?.prototype, window.Text?.prototype].forEach((proto) => {
  if (!proto) return;
  if (typeof proto.getClientRects !== 'function') proto.getClientRects = emptyRectList;
  if (typeof proto.getBoundingClientRect !== 'function') proto.getBoundingClientRect = emptyRect;
});
if (typeof document.elementFromPoint !== 'function') document.elementFromPoint = () => null;

// AI help is off in tests unless a test turns it on (getAiStatus.mockResolvedValue({ enabled: true, ... })).
jest.mock('./services/aiService');
