const createStatment = `
REPLACE OR CREATE TABLE chase_transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    transaction_date DATE NOT NULL,
    post_date DATE NOT NULL,
    description VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    type VARCHAR(50),
    amount DECIMAL(12, 2) NOT NULL,
    memo TEXT,
    filename VARCHAR(255) NOT NULL,
    created TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);`

const transactionInsertExample = `INSERT INTO chase_transactions (transaction_date,post_date,description,category,type,amount,memo,filename) VALUES ('2025-12-30','2025-12-31','PlayStation Network','Entertainment','Sale',-32.24,NULL,'example.csv');`;

const transactionInsert = `INSERT INTO chase_transactions (transaction_date,post_date,description,category,type,amount,memo,filename) VALUES (:transaction_date,:post_date,:description,:category,:type,:amount,:memo,:filename);`;


// Select statements to see transaction year-over-year, month-over-month, week-over-week within a month and category-wise summaries.

const transactionYearOverYear = `
SELECT 
    YEAR(transaction_date) AS year,
    SUM(amount) AS total_amount
FROM chase_transactions
GROUP BY YEAR(transaction_date)
ORDER BY YEAR(transaction_date);
`;

const transactionMonthOverMonth = `
SELECT 
    YEAR(transaction_date) AS year,
    MONTH(transaction_date) AS month,
    SUM(amount) AS total_amount
FROM chase_transactions
GROUP BY YEAR(transaction_date), MONTH(transaction_date)
ORDER BY YEAR(transaction_date), MONTH(transaction_date);
`;

const transactionWeekOverWeek = `
SELECT 
    YEAR(transaction_date) AS year,
    WEEK(transaction_date) AS week,
    SUM(amount) AS total_amount
FROM chase_transactions
GROUP BY YEAR(transaction_date), WEEK(transaction_date)
ORDER BY YEAR(transaction_date), WEEK(transaction_date);
`;

const transactionCategoryWise = `
SELECT 
    category,
    SUM(amount) AS total_amount
FROM chase_transactions
GROUP BY category
ORDER BY total_amount DESC;
`;
