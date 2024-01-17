/** *******************************************************************************************************************
  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.

  Licensed under the Apache License, Version 2.0 (the "License").
  You may not use this file except in compliance with the License.
  You may obtain a copy of the License at

      http://www.apache.org/licenses/LICENSE-2.0

  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  See the License for the specific language governing permissions and
  limitations under the License.
 ******************************************************************************************************************** */
export type EventHandler = (e: CustomEvent) => void;

class EventController {
  private readonly eventStore: {
    [key: string]: EventHandler[];
  };

  constructor() {
    this.eventStore = {};
  }

  addEventListener(eventName: string, eventHandler: EventHandler) {
    if (!this.eventStore[eventName]) {
      this.eventStore[eventName] = [];
    }

    this.eventStore[eventName].push(eventHandler);
  }

  dispatchEvent(event: CustomEvent) {
    if (this.eventStore[event.type]) {
      this.eventStore[event.type].forEach(x => {
        x(event);
      });
    }
  }
}

export default EventController;