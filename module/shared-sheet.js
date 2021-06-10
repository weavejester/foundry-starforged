import { StarforgedActorSheet } from './actor-sheet.js';

/**
 * Specific sheet for 'shared' type of actors.
 * @extends {StarforgedSharedSheet}
 */
export class StarforgedSharedSheet extends StarforgedActorSheet {
  /** @override */
  static get defaultOptions () {
    return mergeObject(super.defaultOptions, { width: 370 });
  }
}
