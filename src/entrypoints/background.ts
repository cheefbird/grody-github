export default defineBackground(() => {
  browser.action.onClicked.addListener(() => {
    browser.runtime.openOptionsPage();
  });
});
