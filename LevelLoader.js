class LevelLoader {
  static fromLevelsJson(allData, index) {
    return new WorldLevel(allData.levels[index]);
  }
}
