// Web Worker für Klassifizierung + Baumaufbau — der rechenintensive Teil der
// Pipeline (eine Regelauswertung je Position). Hält die UI bei großen LVs
// (Richtung ~10k Positionen) responsiv. Das XML-Parsing bleibt im Haupt-Thread,
// weil `DOMParser` im Worker-Scope nicht existiert (siehe runPipeline.ts).

import { toPipelineError, type PipelineRequest, type PipelineResponse } from './messages';
import { classifyAndBuild } from './runPipeline';

self.onmessage = (event: MessageEvent<PipelineRequest>) => {
  const { draft, fileName } = event.data;
  let response: PipelineResponse;
  try {
    response = { ok: true, result: classifyAndBuild(draft, fileName) };
  } catch (error) {
    response = { ok: false, ...toPipelineError(error) };
  }
  self.postMessage(response);
};
