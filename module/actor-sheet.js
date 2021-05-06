import { ironswornRollDialog } from './starforged.js'

/**
 * Extend the basic ActorSheet with some very simple modifications
 * @extends {ActorSheet}
 */
export class IronswornActorSheet extends ActorSheet {
  /** @override */
  static get defaultOptions () {
    return mergeObject(super.defaultOptions, {
      classes: ['ironsworn', 'sheet', 'actor'],
      width: 1200,
      height: 800,
      dragDrop: [{ dragSelector: '.item-list .item', dropSelector: null }],
      tabs: [{ navSelector: ".tabs", contentSelector: ".sheet-body", initial: "actions" }]
    })
  }

  /** @override */
  get template () {
    const path = 'systems/foundry-starforged/templates/actor'
    return `${path}/${this.actor.data.type}.hbs`
  }

  /* -------------------------------------------- */

  /** @override */
  getData () {
    const data = super.getData()

    data.builtInMoves = []
    for (const moveName of MOVES) {
      if (moveName.startsWith('---')) {
        data.builtInMoves.push({
          separator: true,
          title: moveName.substr('--- '.length)
        })
      } else {
        data.builtInMoves.push({
          title: game.i18n.localize(`IRONSWORN.Moves:${moveName}:title`),
          description: game.i18n.localize(`IRONSWORN.Moves:${moveName}:description`),
        })
      }
    }

    data.customMoves = this.actor.items.filter(x => x.type === 'move')

    data.assets = this.actor.items.filter(x => x.type === 'asset')
    data.vows = this.actor.items.filter(x => x.type === 'vow')
    data.progresses = this.actor.items.filter(x => x.type === 'progress')
    data.bonds = this.actor.items.find(x => x.type === 'bondset')

    console.log(data)

    return data
  }

  /* -------------------------------------------- */

  /** @override */
  activateListeners (html) {
    super.activateListeners(html)

    // Everything below here is only needed if the sheet is editable
    if (!this.options.editable) return

    // Handle most clickables
    html.find('.clickable').click(this._rollStat.bind(this))

    html.find('#burn').click(this._burnMomentum.bind(this))

    // Enable editing stats
    html.find('#edit-stats').click(async ev => {
      if (this.actor.getFlag('foundry-starforged', 'editStats')) {
        await this.actor.unsetFlag('foundry-starforged', 'editStats')
      } else {
        await this.actor.setFlag('foundry-starforged', 'editStats', 'true')
      }
    })

    // Moves expand in place
    html.find('.built-in-move-entry').click(this._handleBuiltInMoveExpand.bind(this))
    html.find('.move-entry').click(this._handleMoveExpand.bind(this))
    html.find('.asset-entry').click(this._handleAssetExpand.bind(this))

    // Vow/progress buttons
    html.find('.add-item').click(async ev => {
      let el = $(ev.target)
      if (!el.hasClass('add-item')) {
        el = el.parents('.add-item')
      }
      const itemType = el.data('type')
      this.actor.createOwnedItem(
        { type: itemType, name: `New ${itemType}` },
        { renderSheet: true }
      )
    })
    html.find('.markLegacy').click(ev => {
      const legacyName = $(ev.target).parents('.item-row').data('id')
      return this.actor.updateLegacy(legacyName, 1)
    })
    html.find('.eraseLegacy').click(ev => {
      const legacyName = $(ev.target).parents('.item-row').data('id')
      return this.actor.updateLegacy(legacyName, -1)
    })
    html.find('.markProgress').click(ev => {
      const itemId = $(ev.target)
        .parents('.item-row')
        .data('id')
      const item = this.actor.items.find(x => x._id === itemId)
      return item.markProgress()
    })
    html.find('.fulfillProgress').click(ev => {
      const itemId = $(ev.target)
        .parents('.item-row')
        .data('id')
      const item = this.actor.items.find(x => x._id === itemId)
      return item.fulfill()
    })
    html.find('.edit-item').click(ev => {
      const itemId = $(ev.target)
        .parents('.item-row')
        .data('id')
      const item = this.actor.items.find(x => x._id === itemId)
      item.sheet.render(true)
    })
    html.find('.edit-bonds').click(ev => {
      const itemId = ev.target.dataset.id
      const item = this.actor.items.find(x => x._id === itemId)
      item.sheet.render(true)
    })

    // Update Inventory Item
    html.find('.item-edit').click(ev => {
      ev.preventDefault()
      const li = $(ev.currentTarget).parents('.item')
      const item = this.actor.getOwnedItem(li.data('itemId'))
      item.sheet.render(true)
    })

    // Delete Inventory Item
    html.find('.item-delete').click(ev => {
      ev.preventDefault()
      const li = $(ev.currentTarget).parents('.item')
      this.actor.deleteOwnedItem(li.data('itemId'))
      li.slideUp(200, () => this.render(false))
    })

    // Asset tracks
    html.find('.track-target').click(ev => {
      ev.preventDefault()
      const row = $(ev.currentTarget).parents('.item-row')
      const item = this.actor.getOwnedItem(row.data('id'))
      const newValue = parseInt(ev.currentTarget.dataset.value)
      return item.update({ 'data.track.current': newValue })
    })
    html.find('.item-row').map((i, el) => {
      const item = this.actor.getOwnedItem(el.dataset.id)
      this._attachInlineRollListeners($(el), item)
    })
    html.find('.roll-asset-track').click(ev => {
      const row = $(ev.currentTarget).parents('.item-row')
      const item = this.actor.getOwnedItem(row.data('id'))
      const data = {
        ...this.getData(),
        track: item.data.data.track.current
      }
      ironswornRollDialog(data, 'track', `${item.name}`)
    })
  }

  async _handleBuiltInMoveExpand (ev) {
    ev.preventDefault()
    const li = $(ev.currentTarget).parents('li')
    const summary = li.children('.move-summary')
    if (li.hasClass('expanded')) {
      summary.slideUp(200)
    } else {
      summary.slideDown(200)
    }
    li.toggleClass('expanded')
  }

  async _handleMoveExpand (ev) {
    ev.preventDefault()
    const li = $(ev.currentTarget).parents('li')
    const item = this.actor.getOwnedItem(li.data('id'))

    if (li.hasClass('expanded')) {
      const summary = li.children('.move-summary')
      summary.slideUp(200, () => summary.remove())
    } else {
      const content = this._parseRollPlus(item.data.data.description)
      const div = $(`<div class="move-summary">${content}</div>`)
      this._attachInlineRollListeners(div, item)
      li.append(div.hide())
      div.slideDown(200)
    }
    li.toggleClass('expanded')
  }

  async _handleAssetExpand (ev) {
    ev.preventDefault()
    const li = $(ev.currentTarget).parents('li')
    const item = this.actor.getOwnedItem(li.data('id'))

    const flagKey = `expanded-${item._id}`
    const value = this.actor.getFlag('foundry-starforged', flagKey)
    this.actor.setFlag('foundry-starforged', flagKey, !value)
  }

  _parseRollPlus (text) {
    const rendered = TextEditor.enrichHTML(text)
    return rendered.replace(
      /\(\(rollplus (.*?)\)\)/g,
      `
    <a class='inline-roll' data-param='$1'>
      <i class='fas fa-dice-d6'></i>
      ${game.i18n.localize('IRONSWORN.Roll')} +$1
    </a>`
    )
  }

  _attachInlineRollListeners (html, item) {
    html.find('a.inline-roll').on('click', ev => {
      ev.preventDefault()
      const el = ev.currentTarget
      const moveTitle = `${item?.name || html.data('name')} (${el.dataset.param})`
      const actor = this.actor || {}
      return ironswornRollDialog(actor.data?.data, el.dataset.param, moveTitle)
    })
  }

  async _rollStat (event) {
    event.preventDefault()
    const el = event.currentTarget

    const stat = el.dataset.stat
    if (stat) {
      // Clicked a non-edit stat; trigger a roll
      ironswornRollDialog(this.actor.data.data, stat, `Roll +${stat}`)
    }

    const resource = el.dataset.resource
    if (resource) {
      // Clicked a value in momentum/health/etc, set the value
      const newValue = parseInt(el.dataset.value)
      const { momentumMax } = this.actor.data.data
      if (resource !== 'momentum' || newValue <= momentumMax) {
        await this.actor.update({ data: { [resource]: newValue } })
      }
    }

    const tableName = el.dataset.table
    if (tableName) {
      // Clicked an oracle, roll from the table
      let table = game.tables.find(x => x.name === tableName)
      if (!table) {
        const pack = game.packs.get('foundry-starforged.starforged-tables')
        const index = await pack.getIndex()
        const entry = index.find(x => x.name == tableName)
        if (entry) table = await pack.getEntity(entry._id)
      }
      if (table) table.draw()
    }
  }

  async _rollDialog (key) {
    const move = MOVES[key]
    const html = await renderTemplate(
      'systems/foundry-starforged/templates/move-dialog.hbs',
      move
    )

    new Dialog({
      title: move.title,
      content: html,
      buttons: {
        roll: {
          icon: '<i class="roll die d10"></i>',
          label: game.i18n.localize('IRONSWORN.Roll'),
          callback: function () {
            console.log(this, 'Chose One')
          }
        }
      }
    }).render(true)
  }

  async _burnMomentum (event) {
    event.preventDefault()

    const { momentum, momentumReset } = this.actor.data.data
    if (momentum > momentumReset) {
      await this.actor.update({
        _id: this.actor.id,
        data: { momentum: momentumReset }
      })
    }
  }
}

const MOVES = [
  '--- Adventure',
  'Face Danger',
  'Secure an Advantage',
  'Gather Information',
  'Compel',
  'Aid Your Ally',
  'Check Your Gear',
  '--- Combat',
  'Enter the Fray',
  'Gain Ground',
  'React Under Fire',
  'Strike',
  'Clash',
  'Face Defeat',
  'Take Decisive Action',
  'Battle',
  '--- Exploration',
  'Undertake an Expedition',
  'Explore a Waypoint',
  'Finish an Expedition',
  'Set a Course',
  'Make a Discovery',
  'Confront Chaos',
  '--- Fate',
  'Pay the Price',
  'Ask the Oracle',
  '--- Legacy',
  'Advance',
  'Continue a Legacy',
  '--- Quest',
  'Swear an Iron Vow',
  'Reach a Milestone',
  'Fulfill Your Vow',
  'Forsake Your Vow',
  'Advance',
  '--- Recover',
  'Sojourn',
  'Heal',
  'Hearten',
  'Repair',
  'Resupply',
  '--- Suffer',
  'Lose Momentum',
  'Endure Harm',
  'Endure Stress',
  'Withstand Damage',
  'Companion Takes a Hit',
  'Sacrifice Resources',
  '--- Threshold',
  'Face Death',
  'Face Desolation',
  'Overcome Destruction'
]
