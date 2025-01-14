/**
 * Copyright 2022 Google Inc. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import {createDeferredPromise} from '../util/DeferredPromise.js';
import * as Poller from './Poller.js';
import * as TextContent from './TextContent.js';
import * as TextQuerySelector from './TextQuerySelector.js';
import * as XPathQuerySelector from './XPathQuerySelector.js';
import * as PierceQuerySelector from './PierceQuerySelector.js';
import * as util from './util.js';

const PuppeteerUtil = Object.freeze({
  ...util,
  ...Poller,
  ...TextContent,
  ...TextQuerySelector,
  ...XPathQuerySelector,
  ...PierceQuerySelector,
  createDeferredPromise,
});

type PuppeteerUtil = typeof PuppeteerUtil;

export default PuppeteerUtil;
