const marked = require('marked')
const fetch  = require('node-fetch')
const fs     = require('fs/promises')
const util   = require('util')

function renderHtml (text) {
  return marked(
    text.replace(
      /(roll ?)?\+(iron|edge|wits|shadow|heart|health|spirit|supply)/gi,
      '((rollplus $2))'
    ),
    { gfm: true }
  )
}

function parseAssets(json) {
  return json.Assets.map(asset => {
    const track = {enabled: false, name: '', max: 0, current: 0}

    if (asset.Track) {
      track.enabled = true
      track.name    = asset.Track.Name
      track.max     = asset.Track.Value
      track.current = asset.Track['Starts At'] ?? track.max
    }
  
    return {
      name: `${asset.Category} / ${asset.Name}`,
      data: {
        description: asset.Description,
        fields: (asset.Fields || []).map(x => ({
          name: x,
          value: ''
        })),
        abilities: asset.Abilities.map(x => {
          const description = x.Name ? `**${x.Name}:** ${x.Text}` : x.Text
          return {
            enabled: x.Enabled || false,
            description: renderHtml(description)
          }
        }),
        track
      }
    }
  })
}

function parseMoves(json) {
  return json.Moves.map(move => {
    return {
      name: move.Name,
      data: {
        category: move.Category,
        description: renderHtml(move.Text)
      }
    }
  })
}

function parseOracles(json) {
  return json.Oracles.
    filter(oracle => oracle.Table != null).
    map(oracle => {
      let chance = 0
      const results = oracle.Table.map(row => {
        const result = {
          type: 0,
          text: row.Description,
          weight: row.Chance - chance,
          range: [chance + 1, row.Chance]
        }
        chance = row.Chance
        return result
      })

      return {
        name: oracle.Name,
        results: results,
        formula: "1d100",
        replacement: true,
        displayRoll: true
      }
    })
}

async function doit () {
  const assets = await fetch('https://raw.githubusercontent.com/rsek/dataforged/main/assets.json').
    then(result => result.json()).
    then(parseAssets)

  await fs.writeFile('assets/assets.json', JSON.stringify(assets, null, 2))

  // Moves
  const moveURLs = [
    'https://raw.githubusercontent.com/rsek/dataforged/main/moves/adventure.json',
    'https://raw.githubusercontent.com/rsek/dataforged/main/moves/combat.json',
    'https://raw.githubusercontent.com/rsek/dataforged/main/moves/connection.json',
    'https://raw.githubusercontent.com/rsek/dataforged/main/moves/exploration.json',
    'https://raw.githubusercontent.com/rsek/dataforged/main/moves/fate.json',
    'https://raw.githubusercontent.com/rsek/dataforged/main/moves/legacy.json',
    'https://raw.githubusercontent.com/rsek/dataforged/main/moves/quest.json',
    'https://raw.githubusercontent.com/rsek/dataforged/main/moves/recover.json',
    'https://raw.githubusercontent.com/rsek/dataforged/main/moves/suffer.json',
    'https://raw.githubusercontent.com/rsek/dataforged/main/moves/threshold.json'
  ]

  const moves = await fetch('https://raw.githubusercontent.com/rsek/dataforged/main/moves.json').
    then(result => result.json()).
    then(parseMoves)
  
  await fs.writeFile('assets/moves.json', JSON.stringify(moves, null, 2))

  const en = JSON.parse(await fs.readFile('lang/en.json'))
  for (const move of moves) {
    en[`STARFORGED.Moves:${move.name}:title`] = move.name
    en[`STARFORGED.Moves:${move.name}:description`] = move.data.description
  }
  await fs.writeFile('lang/en.json', JSON.stringify(en, null, 2))

  const oracleURLs = [
    'https://raw.githubusercontent.com/rsek/dataforged/main/oracles/campaign.json',
    'https://raw.githubusercontent.com/rsek/dataforged/main/oracles/character.json',
    'https://raw.githubusercontent.com/rsek/dataforged/main/oracles/core.json',
    'https://raw.githubusercontent.com/rsek/dataforged/main/oracles/creature.json',
    'https://raw.githubusercontent.com/rsek/dataforged/main/oracles/derelict/exterior.json',
    'https://raw.githubusercontent.com/rsek/dataforged/main/oracles/derelict/interior.json',
    'https://raw.githubusercontent.com/rsek/dataforged/main/oracles/derelict/zone/access.json',
    'https://raw.githubusercontent.com/rsek/dataforged/main/oracles/derelict/zone/community.json',
    'https://raw.githubusercontent.com/rsek/dataforged/main/oracles/derelict/zone/engineering.json',
    'https://raw.githubusercontent.com/rsek/dataforged/main/oracles/derelict/zone/living.json',
    'https://raw.githubusercontent.com/rsek/dataforged/main/oracles/derelict/zone/medical.json',
    'https://raw.githubusercontent.com/rsek/dataforged/main/oracles/derelict/zone/operations.json',
    'https://raw.githubusercontent.com/rsek/dataforged/main/oracles/derelict/zone/production.json',
    'https://raw.githubusercontent.com/rsek/dataforged/main/oracles/derelict/zone/research.json',
    'https://raw.githubusercontent.com/rsek/dataforged/main/oracles/location_theme/chaotic.json',
    'https://raw.githubusercontent.com/rsek/dataforged/main/oracles/location_theme/fortified.json',
    'https://raw.githubusercontent.com/rsek/dataforged/main/oracles/location_theme/haunted.json',
    'https://raw.githubusercontent.com/rsek/dataforged/main/oracles/location_theme/infested.json',
    'https://raw.githubusercontent.com/rsek/dataforged/main/oracles/location_theme/inhabited.json',
    'https://raw.githubusercontent.com/rsek/dataforged/main/oracles/location_theme/location_theme.json',
    'https://raw.githubusercontent.com/rsek/dataforged/main/oracles/location_theme/ruined.json',
    'https://raw.githubusercontent.com/rsek/dataforged/main/oracles/location_theme/sacred.json',
    'https://raw.githubusercontent.com/rsek/dataforged/main/oracles/planet/desert.json',
    'https://raw.githubusercontent.com/rsek/dataforged/main/oracles/planet/furnace.json',
    'https://raw.githubusercontent.com/rsek/dataforged/main/oracles/planet/grave.json',
    'https://raw.githubusercontent.com/rsek/dataforged/main/oracles/planet/ice.json',
    'https://raw.githubusercontent.com/rsek/dataforged/main/oracles/planet/jovian.json',
    'https://raw.githubusercontent.com/rsek/dataforged/main/oracles/planet/jungle.json',
    'https://raw.githubusercontent.com/rsek/dataforged/main/oracles/planet/ocean.json',
    'https://raw.githubusercontent.com/rsek/dataforged/main/oracles/planet/planet.json',
    'https://raw.githubusercontent.com/rsek/dataforged/main/oracles/planet/rocky.json',
    'https://raw.githubusercontent.com/rsek/dataforged/main/oracles/planet/shattered.json',
    'https://raw.githubusercontent.com/rsek/dataforged/main/oracles/planet/tainted.json',
    'https://raw.githubusercontent.com/rsek/dataforged/main/oracles/planet/vital.json',
    'https://raw.githubusercontent.com/rsek/dataforged/main/oracles/precursor_vault/exterior.json',
    'https://raw.githubusercontent.com/rsek/dataforged/main/oracles/precursor_vault/interior.json',
    'https://raw.githubusercontent.com/rsek/dataforged/main/oracles/precursor_vault/sanctum.json',
    'https://raw.githubusercontent.com/rsek/dataforged/main/oracles/misc.json',
    'https://raw.githubusercontent.com/rsek/dataforged/main/oracles/move.json',
    'https://raw.githubusercontent.com/rsek/dataforged/main/oracles/setting_truths.json',
    'https://raw.githubusercontent.com/rsek/dataforged/main/oracles/settlement.json',
    'https://raw.githubusercontent.com/rsek/dataforged/main/oracles/space.json',
    'https://raw.githubusercontent.com/rsek/dataforged/main/oracles/starship.json'
  ]

  const oracles = await Promise.all(oracleURLs.map(url => fetch(url).then(r => r.json()))).
    then(oracles => [].concat(...oracles.map(parseOracles)))

  await fs.writeFile('assets/oracles.json', JSON.stringify(oracles, null, 2))
}

doit().then(
  () => process.exit(),
  err => {
    console.error(err)
    process.exit(-1)
  }
)
