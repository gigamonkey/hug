function doGet() {
  return HtmlService.createHtmlOutputFromFile('index')
    .setTitle('My App');
}
