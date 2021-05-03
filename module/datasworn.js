export async function importFromDatasworn () {
  // Empty out the packs
  for (const key of ['foundry-starforged.starforged-items', 'foundry-starforged.starforged-assets']) {
    const pack = game.packs.get(key)
    await pack.render(true)
    const idsToDelete = pack.index.map(x => x._id)
    for (const id of idsToDelete) {
      await pack.deleteEntity(id)
    }
  }

  // Moves
  const movesPack = game.packs.get('foundry-starforged.starforged-items')
  const movesJson = await fetch(
    '/systems/foundry-starforged/assets/moves.json'
  ).then(x => x.json())
  for (const move of movesJson) {
    await movesPack.createEntity({
      type: 'move',
      ...move
    })
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
}
