// Serve the web page
const doGet = (e) => {
  return HtmlService.createHtmlOutputFromFile('index');
};

// Called from web page to save student's current rankings
const saveRankings = (data) => {
  const lock = LockService.getScriptLock();
  
  try {
    lock.waitLock(30000); 
    const email = Session.getActiveUser().getEmail();
    const sheet = rankingsSheet();
    const studentEmail = data.studentEmail || email;
    const ranks = [...data.ranks.slice(0, 5), ...Array(5 - data.ranks.length).fill('')]
    sheet.appendRow([new Date(), email, studentEmail, ...ranks, data.studentNumber, data.reason]);
    SpreadsheetApp.flush();
    return "Done!";

  } catch (e) {
    return "Error: The server is busy. Please try again in a moment.";
  } finally {
    lock.releaseLock();
  }
};

const whoami = () => Session.getActiveUser().getEmail();

// Called from web page to get student's current rankings
const getRankings = (studentEmail) => {
  const user = Session.getActiveUser().getEmail();
  if (studentEmail) {
    if (user.match(/@berkeley\.net$/)) { 
      return JSON.stringify(currentRankings(studentEmail));
    } else {
      return {};
    }
  } else {
    return JSON.stringify(currentRankings(user));
  }
}

const rankingsSheet = () => {
  return SpreadsheetApp.getActiveSpreadsheet().getSheetById(0);
};

const currentRankings = (email) => {
  const sheet = rankingsSheet();
  const data = sheet.getDataRange().getValues();
  const idx = data.findLastIndex(row => row[2] === email);
  
  if (idx !== -1) {
    const [ timestamp, user, email, ...rankings ] = data[idx].slice(0, 8).filter(x => x != '');
    return { timestamp, email, rankings };
  } else {
    return {};
  }
};
