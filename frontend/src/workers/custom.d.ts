/* ./worker/custom.d.ts */

import { NumberStatsState } from "../charts/NumberStats/NumberStats";
import { Dataset } from "../types/Dataset";

declare module 'comlink-loader!*' {
    class WebpackWorker extends Worker {
      constructor();
  
      // Add any custom functions to this class.
      // Make note that the return type needs to be wrapped in a promise.
      getNumberStatsFromDataset(data: Dataset): Promise<NumberStatsState>;
    }
  
    export = WebpackWorker;
  }