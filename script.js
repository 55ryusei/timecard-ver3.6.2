document.getElementById('timeCardForm').addEventListener('submit', function(event) {
    event.preventDefault();
    saveTimeCard();
});

document.getElementById('exportBtn').addEventListener('click', function() {
    exportToExcel();
});

document.getElementById('clearDataBtn').addEventListener('click', function() {
    requestPasswordAndClearData();
});

document.getElementById('backupBtn').addEventListener('click', function() {
    backupData();
});

document.getElementById('backupLatestMonthBtn').addEventListener('click', function() {
    backupLatestMonthData();
});

document.getElementById('restoreBtn').addEventListener('click', function() {
    document.getElementById('restoreFile').click();
});

document.getElementById('restoreFile').addEventListener('change', function(event) {
    restoreData(event.target.files[0]);
});

document.getElementById('searchName').addEventListener('input', function() {
    displayTimeCards();
});

function saveTimeCard() {
    const date = document.getElementById('date').value;
    const name = document.getElementById('name').value.trim();
    const checkIn = document.getElementById('checkIn').value;
    const checkOut = document.getElementById('checkOut').value;

    if (!name) {
        alert('名前を入力してください。');
        return;
    }

    const timeCardData = {
        checkIn: checkIn,
        checkOut: checkOut
    };

    let allTimeCards = JSON.parse(localStorage.getItem('timeCards')) || {};
    if (!allTimeCards[name]) {
        allTimeCards[name] = {};
    }
    if (!allTimeCards[name][date]) {
        allTimeCards[name][date] = [];
    }

    allTimeCards[name][date].push(timeCardData);

    localStorage.setItem('timeCards', JSON.stringify(allTimeCards));

    document.getElementById('timeCardForm').reset();
    displayTimeCards();
}

function displayTimeCards() {
    const searchName = document.getElementById('searchName').value.trim().toLowerCase();
    const allTimeCards = JSON.parse(localStorage.getItem('timeCards')) || {};
    const resultDiv = document.getElementById('result');
    resultDiv.innerHTML = '<h2>タイムカード一覧</h2>';

    for (let name in allTimeCards) {
        if (searchName && !name.toLowerCase().includes(searchName)) continue;
        resultDiv.innerHTML += `<h3>${name}</h3>`;
        const dates = Object.keys(allTimeCards[name]).sort();
        for (let date of dates) {
            resultDiv.innerHTML += `<h4>${date}</h4>`;
            if (allTimeCards[name][date] && Array.isArray(allTimeCards[name][date])) {
                allTimeCards[name][date].forEach((card, index) => {
                    if (card && card.checkIn && card.checkOut) {
                        resultDiv.innerHTML += `
                            <div>
                                <p><strong>出勤時間:</strong> ${card.checkIn}</p>
                                <p><strong>退勤時間:</strong> ${card.checkOut}</p>
                                <button class="delete-button" onclick="deleteTimeCard('${name}', '${date}', ${index})">削除</button>
                                <hr>
                            </div>
                        `;
                    }
                });
            }
        }
    }
}

function deleteTimeCard(name, date, index) {
    if (!confirm('本当に削除しますか？')) {
        return;
    }

    let allTimeCards = JSON.parse(localStorage.getItem('timeCards')) || {};
    allTimeCards[name][date].splice(index, 1);
    if (allTimeCards[name][date].length === 0) {
        delete allTimeCards[name][date];
    }
    if (Object.keys(allTimeCards[name]).length === 0) {
        delete allTimeCards[name];
    }
    localStorage.setItem('timeCards', JSON.stringify(allTimeCards));
    displayTimeCards();
}

function requestPasswordAndClearData() {
    const password = prompt('パスワードを入力してください:');
    if (password === '4564') {
        if (confirm('本当にすべてのデータをクリアしますか？')) {
            localStorage.removeItem('timeCards');
            displayTimeCards();
        }
    } else {
        alert('パスワードが違います。');
    }
}

function calculateTimeDifference(startTime, endTime) {
    const start = new Date(`1970-01-01T${startTime}`);
    const end = new Date(`1970-01-01T${endTime}`);
    const diff = (end - start) / (1000 * 60 * 60); // difference in hours
    return diff.toFixed(2); // round to 2 decimal places
}

function calculateEarlyMorningTime(startTime, endTime) {
    const endLimit = new Date('1970-01-01T08:30');
    const start = new Date(`1970-01-01T${startTime}`);
    const end = new Date(`1970-01-01T${endTime}`);
    if (end <= endLimit) {
        return parseFloat(calculateTimeDifference(startTime, endTime));
    } else if (start < endLimit) {
        return parseFloat(calculateTimeDifference(startTime, '08:30'));
    }
    return 0;
}

function calculateEveningTime(startTime, endTime) {
    const startLimit = new Date('1970-01-01T16:00');
    const start = new Date(`1970-01-01T${startTime}`);
    const end = new Date(`1970-01-01T${endTime}`);
    if (start >= startLimit) {
        return parseFloat(calculateTimeDifference(startTime, endTime));
    } else if (end > startLimit) {
        return parseFloat(calculateTimeDifference('16:00', endTime));
    }
    return 0;
}

function formatDate(dateString) {
    const date = new Date(dateString);
    const month = ('0' + (date.getMonth() + 1)).slice(-2);
    const day = ('0' + date.getDate()).slice(-2);
    return `${month}-${day}`;
}

function getMonthPeriod(dateString) {
    const date = new Date(dateString);
    let startMonth, startYear, endMonth, endYear;

    if (date.getDate() >= 11) {
        startMonth = date.getMonth();
        startYear = date.getFullYear();
        endMonth = (startMonth + 1) % 12;
        endYear = startMonth === 11 ? startYear + 1 : startYear;
    } else {
        startMonth = (date.getMonth() - 1 + 12) % 12;
        startYear = startMonth === 11 ? date.getFullYear() - 1 : date.getFullYear();
        endMonth = date.getMonth();
        endYear = date.getFullYear();
    }

    const start = new Date(startYear, startMonth, 11);
    const end = new Date(endYear, endMonth, 10);

    return { start, end, startMonth };
}

function exportToExcel() {
    const allTimeCards = JSON.parse(localStorage.getItem('timeCards')) || {};
    const workbook = XLSX.utils.book_new();

    for (let name in allTimeCards) {
        const periods = {};

        // データを期間ごとに分ける
        for (let date in allTimeCards[name]) {
            const period = getMonthPeriod(date);
            const periodKey = `${period.start.toISOString().slice(0, 10)}_${period.end.toISOString().slice(0, 10)}`;

            if (!periods[periodKey]) {
                periods[periodKey] = [];
            }

            allTimeCards[name][date].forEach((card) => {
                if (card && card.checkIn && card.checkOut) { // データが正しい形式であることを確認
                    periods[periodKey].push({
                        date,
                        checkIn: card.checkIn,
                        checkOut: card.checkOut,
                        totalHours: calculateTimeDifference(card.checkIn, card.checkOut),
                        earlyMorningHours: calculateEarlyMorningTime(card.checkIn, card.checkOut),
                        eveningHours: calculateEveningTime(card.checkIn, card.checkOut)
                    });
                }
            });
        }

        // 期間ごとにシートを作成
        for (let periodKey in periods) {
            const period = getMonthPeriod(periods[periodKey][0].date);
            const monthNames = ["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"];
            const sheetName = `${name}${monthNames[period.startMonth]}`;

            const sheetData = [
                [`名前: ${name}`],
                ['日付', '出勤時間', '退勤時間', '合計', '早朝勤務', '夕方勤務', '通常合計']
            ];

            let totalEarlyMorning = 0;
            let totalEvening = 0;
            let totalNormal = 0;
            let totalDay = 0;

            // 日付順にソート
            periods[periodKey].sort((a, b) => new Date(a.date) - new Date(b.date));

            periods[periodKey].forEach((entry) => {
                if (entry.checkIn && entry.checkOut) {
                    const normalHours = (entry.totalHours - entry.earlyMorningHours - entry.eveningHours).toFixed(2);

                    totalEarlyMorning += entry.earlyMorningHours;
                    totalEvening += entry.eveningHours;
                    totalNormal += parseFloat(normalHours);
                    totalDay += parseFloat(entry.totalHours);

                    const row = [
                        formatDate(entry.date),
                        entry.checkIn,
                        entry.checkOut,
                        entry.totalHours,
                        entry.earlyMorningHours.toFixed(2),
                        entry.eveningHours.toFixed(2),
                        normalHours
                    ];
                    sheetData.push(row);
                }
            });

            // 合計行を追加
            sheetData.push([]);
            sheetData.push(['1ヶ月合計', '', '', totalDay.toFixed(2), totalEarlyMorning.toFixed(2), totalEvening.toFixed(2), totalNormal.toFixed(2)]);

            const worksheet = XLSX.utils.aoa_to_sheet(sheetData);
            XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
        }
    }

    XLSX.writeFile(workbook, 'timecards.xlsx');
}

function backupData() {
    const allTimeCards = JSON.parse(localStorage.getItem('timeCards')) || {};
    const dataStr = JSON.stringify(allTimeCards);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });

    const url = URL.createObjectURL(dataBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'timecards_backup.json';
    a.click();
    URL.revokeObjectURL(url);
}

function getLatestMonthPeriod() {
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    const startYear = (today.getDate() >= 11) ? currentYear : (currentMonth === 0 ? currentYear - 1 : currentYear);
    const startMonth = (today.getDate() >= 11) ? currentMonth : (currentMonth === 0 ? 11 : currentMonth - 1);
    const endYear = (startMonth === 11) ? startYear + 1 : startYear;
    const endMonth = (startMonth + 1) % 12;

    const start = new Date(startYear, startMonth, 11);
    const end = new Date(endYear, endMonth, 10);

    return { start, end };
}

function backupLatestMonthData() {
    const allTimeCards = JSON.parse(localStorage.getItem('timeCards')) || {};
    const latestMonthPeriod = getLatestMonthPeriod();
    const latestMonthData = {};

    for (let name in allTimeCards) {
        for (let date in allTimeCards[name]) {
            const recordDate = new Date(date);
            if (recordDate >= latestMonthPeriod.start && recordDate <= latestMonthPeriod.end) {
                if (!latestMonthData[name]) {
                    latestMonthData[name] = {};
                }
                if (!latestMonthData[name][date]) {
                    latestMonthData[name][date] = [];
                }
                latestMonthData[name][date] = allTimeCards[name][date];
            }
        }
    }

    if (Object.keys(latestMonthData).length === 0) {
        alert('最新の月のデータがありません。');
        return;
    }

    const dataStr = JSON.stringify(latestMonthData);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });

    const url = URL.createObjectURL(dataBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'latest_month_timecards_backup.json';
    a.click();
    URL.revokeObjectURL(url);
}

function restoreData(file) {
    const reader = new FileReader();
    reader.onload = function(event) {
        try {
            const allTimeCards = JSON.parse(event.target.result);
            if (allTimeCards && typeof allTimeCards === 'object') {
                localStorage.setItem('timeCards', JSON.stringify(allTimeCards));
                displayTimeCards();
            } else {
                alert('無効なデータ形式です。');
            }
        } catch (e) {
            alert('データの読み込み中にエラーが発生しました。');
        }
    };
    reader.readAsText(file);
}

document.addEventListener('DOMContentLoaded', displayTimeCards);
