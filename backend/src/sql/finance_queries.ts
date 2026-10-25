
/**
 * SQL queries consumed by the personal finance metrics API.
 * Assumes MySQL 8.0+ and a chase_transactions table.
 * Negative amounts represent spending; positive amounts represent money received.
 */

export const financeQueries = {
    /**
     * 1. Daily net transaction changes and cumulative balance change.
     * Add the verified opening balance to cumulative_net_change
     * to calculate the actual account balance.
     */
    dailyBalance: `
        SELECT
            transaction_date,
            ROUND(SUM(amount), 2) AS daily_net_change,
            ROUND(
                SUM(SUM(amount)) OVER (
                    ORDER BY transaction_date
                ),
                2
            ) AS cumulative_net_change
        FROM chase_transactions
        GROUP BY transaction_date
        ORDER BY transaction_date ASC;
    `,

    /**
     * 2. Total spending for each month.
     */
    monthlySpending: `
        SELECT
            DATE_FORMAT(transaction_date, '%Y-%m') AS month,
            ROUND(
                -SUM(CASE WHEN amount < 0 THEN amount ELSE 0 END),
                2
            ) AS total_spending
        FROM chase_transactions
        GROUP BY DATE_FORMAT(transaction_date, '%Y-%m')
        ORDER BY month ASC;
    `,

    /**
     * 3. Month-over-month spending change and percentage.
     */
    monthlySpendingComparison: `
        WITH monthly AS (
            SELECT
                DATE_FORMAT(transaction_date, '%Y-%m') AS month,
                -SUM(CASE WHEN amount < 0 THEN amount ELSE 0 END)
                    AS spending
            FROM chase_transactions
            GROUP BY DATE_FORMAT(transaction_date, '%Y-%m')
        ),
        comparison AS (
            SELECT
                month,
                spending,
                LAG(spending) OVER (ORDER BY month) AS previous_month
            FROM monthly
        )
        SELECT
            month,
            ROUND(spending, 2) AS spending,
            ROUND(previous_month, 2) AS previous_month,
            ROUND(spending - previous_month, 2) AS change_amount,
            ROUND(
                100.0 * (spending - previous_month)
                / NULLIF(previous_month, 0),
                2
            ) AS change_percent
        FROM comparison
        ORDER BY month ASC;
    `,

    /**
     * 4. Year-over-year spending comparison.
     */
    yearlySpendingComparison: `
        WITH yearly AS (
            SELECT
                YEAR(transaction_date) AS year,
                -SUM(CASE WHEN amount < 0 THEN amount ELSE 0 END)
                    AS spending
            FROM chase_transactions
            GROUP BY YEAR(transaction_date)
        ),
        comparison AS (
            SELECT
                year,
                spending,
                LAG(spending) OVER (ORDER BY year) AS previous_year
            FROM yearly
        )
        SELECT
            year,
            ROUND(spending, 2) AS spending,
            ROUND(previous_year, 2) AS previous_year,
            ROUND(spending - previous_year, 2) AS change_amount,
            ROUND(
                100.0 * (spending - previous_year)
                / NULLIF(previous_year, 0),
                2
            ) AS change_percent
        FROM comparison
        ORDER BY year ASC;
    `,

    /**
     * 5. Spending, purchase count, and average purchase by category.
     */
    spendingByCategory: `
        SELECT
            Category AS category,
            ROUND(
                -SUM(CASE WHEN amount < 0 THEN amount ELSE 0 END),
                2
            ) AS spending,
            COUNT(CASE WHEN amount < 0 THEN 1 END) AS transaction_count,
            ROUND(
                -SUM(CASE WHEN amount < 0 THEN amount ELSE 0 END)
                / NULLIF(COUNT(CASE WHEN amount < 0 THEN 1 END), 0),
                2
            ) AS average_purchase
        FROM chase_transactions
        GROUP BY Category
        ORDER BY spending DESC;
    `,

    /**
     * 6. Monthly money in, money out, and net cash flow.
     */
    monthlyCashFlow: `
        SELECT
            DATE_FORMAT(transaction_date, '%Y-%m') AS month,
            ROUND(
                SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END),
                2
            ) AS money_in,
            ROUND(
                -SUM(CASE WHEN amount < 0 THEN amount ELSE 0 END),
                2
            ) AS money_out,
            ROUND(SUM(amount), 2) AS net_cash_flow
        FROM chase_transactions
        GROUP BY DATE_FORMAT(transaction_date, '%Y-%m')
        ORDER BY month ASC;
    `,

    /**
     * 7. Twenty largest purchases.
     */
    largestPurchases: `
        SELECT
            transaction_date,
            Description AS description,
            Category AS category,
            ABS(amount) AS purchase_amount
        FROM chase_transactions
        WHERE amount < 0
        ORDER BY amount ASC
        LIMIT 20;
    `,

    /**
     * 8. Spending by day of the week.
     */
    spendingByWeekday: `
        SELECT
            DAYNAME(transaction_date) AS day_of_week,
            DAYOFWEEK(transaction_date) AS day_number,
            ROUND(
                -SUM(CASE WHEN amount < 0 THEN amount ELSE 0 END),
                2
            ) AS spending,
            COUNT(CASE WHEN amount < 0 THEN 1 END) AS purchase_count
        FROM chase_transactions
        GROUP BY
            DAYNAME(transaction_date),
            DAYOFWEEK(transaction_date)
        ORDER BY day_number ASC;
    `,

    /**
     * 9. Spending by month and category.
     * Suitable for a stacked monthly spending chart.
     */
    monthlySpendingByCategory: `
        SELECT
            DATE_FORMAT(transaction_date, '%Y-%m') AS month,
            Category AS category,
            ROUND(
                -SUM(CASE WHEN amount < 0 THEN amount ELSE 0 END),
                2
            ) AS spending
        FROM chase_transactions
        GROUP BY
            DATE_FORMAT(transaction_date, '%Y-%m'),
            Category
        ORDER BY month ASC, spending DESC;
    `,

    /**
     * 10. Average monthly spending.
     * Averages months that contain at least one transaction.
     */
    averageMonthlySpending: `
        WITH monthly AS (
            SELECT
                DATE_FORMAT(transaction_date, '%Y-%m') AS month,
                -SUM(CASE WHEN amount < 0 THEN amount ELSE 0 END)
                    AS spending
            FROM chase_transactions
            GROUP BY DATE_FORMAT(transaction_date, '%Y-%m')
        )
        SELECT
            ROUND(AVG(spending), 2) AS average_monthly_spending
        FROM monthly;
    `,

    /**
     * 11. Recurring transaction candidates.
     * This finds descriptions appearing in at least three distinct months.
     * It does not prove that a transaction is a subscription.
     */
    recurringTransactions: `
        SELECT
            Description AS description,
            COUNT(*) AS transaction_count,
            COUNT(DISTINCT DATE_FORMAT(transaction_date, '%Y-%m'))
                AS months_present,
            ROUND(AVG(ABS(amount)), 2) AS average_amount,
            MIN(transaction_date) AS first_seen,
            MAX(transaction_date) AS last_seen
        FROM chase_transactions
        GROUP BY Description
        HAVING COUNT(
            DISTINCT DATE_FORMAT(transaction_date, '%Y-%m')
        ) >= 3
        ORDER BY months_present DESC, transaction_count DESC;
    `,

    /**
     * 12. Spending concentration by category, expressed as a percentage.
     */
    spendingConcentration: `
        WITH category_totals AS (
            SELECT
                Category AS category,
                -SUM(CASE WHEN amount < 0 THEN amount ELSE 0 END)
                    AS spending
            FROM chase_transactions
            GROUP BY Category
        )
        SELECT
            category,
            ROUND(spending, 2) AS spending,
            ROUND(
                100.0 * spending / NULLIF(SUM(spending) OVER (), 0),
                2
            ) AS percentage_of_total
        FROM category_totals
        ORDER BY spending DESC;
    `,

    /**
     * 13. Budget versus actual spending.
     * Requires a budget table with category, budget_month (DATE),
     * and budget_amount (DECIMAL).
     */
    budgetVsActual: `
        SELECT
            b.category,
            b.budget_month,
            b.budget_amount,
            COALESCE(t.actual_spending, 0) AS actual_spending,
            ROUND(
                b.budget_amount - COALESCE(t.actual_spending, 0),
                2
            ) AS remaining_budget
        FROM finance_budgets AS b
        LEFT JOIN (
            SELECT
                Category AS category,
                STR_TO_DATE(
                    DATE_FORMAT(transaction_date, '%Y-%m-01'),
                    '%Y-%m-%d'
                ) AS spending_month,
                -SUM(amount) AS actual_spending
            FROM chase_transactions
            WHERE amount < 0
            GROUP BY
                Category,
                DATE_FORMAT(transaction_date, '%Y-%m-01')
        ) AS t
            ON t.category = b.category
            AND t.spending_month = b.budget_month
        ORDER BY b.budget_month ASC, b.category ASC;
    `,

    /**
     * 14. Current calendar-year spending.
     */
    yearToDateSpending: `
        SELECT
            ROUND(
                -SUM(CASE WHEN amount < 0 THEN amount ELSE 0 END),
                2
            ) AS year_to_date_spending
        FROM chase_transactions
        WHERE transaction_date >= MAKEDATE(YEAR(CURDATE()), 1)
          AND transaction_date < CURDATE() + INTERVAL 1 DAY;
    `,
} as const;
