export async function importFromDatasworn () {
  const packs = [
    'foundry-starforged.starforged-assets',
    'foundry-starforged.starforged-tables'
  ]

  // Empty out the packs
  for (const key of packs) {
    const pack = game.packs.get(key)
    await pack.render(true)
    const idsToDelete = await pack.getIndex().then(idx => idx.map(x => x._id))
    for (const id of idsToDelete) {
      await pack.deleteEntity(id)
    }
  }

  // Assets
  const assetsPack = game.packs.get('foundry-starforged.starforged-assets')
  const assetsJson = await fetch(
    '/systems/foundry-starforged/assets/assets.json'
  ).then(x => x.json())
  for (const asset of assetsJson) {
    await assetsPack.createEntity({
      type: 'asset',
      ...asset
    })
  }

  // Tables
  const tablesPack = game.packs.get('foundry-starforged.starforged-tables')
  const tablesJson = await fetch(
    '/systems/foundry-starforged/assets/oracles.json'
  ).then(x => x.json())
  for (const table of tablesJson) {
    await tablesPack.createEntity(table)
  }
}
