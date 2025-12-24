import { z } from 'genkit';

import { ai } from '@shared/ai-instance';

type IInputSchema = {
  homePrice: number;
  downPayment: number;
  loanTerm: number;
  interestRate: number;
  zipCode: string;
};

export const mortgageCalculator = ai.defineTool(
  {
    name: 'mortgageCalculator',
    description: 'Calculate mortgage for the U.S real estate market',
    inputSchema: z.object({
      homePrice: z.number().describe('The home price that you are trying to calculate the mortgage.'),
      downPayment: z.number().describe('Portion of the sale price of a home that is not financed.'),
      loanTerm: z.number().describe('The Amount of time or number of years that you will have to repay a loan.'),
      interestRate: z
        .number()
        .describe('Amount you will pay each year to borrow the money for your loan, expressed as a percentage.'),
      zipCode: z.string().describe('The zip code'),
    }),
    outputSchema: z.object({
      monthlyPayment: z
        .number()
        .optional()
        .describe(
          'The amount of money that you will have to pay every month to finance a home with the provided values.',
        ),
      totalAmount: z.number().optional().describe('Total Amount Paid over the loan term.'),
      totalInterest: z.number().optional().describe('Total Interest Paid over the loan term.'),
      status: z.string().optional().describe('Status of the calculation.'),
      message: z.string().optional().describe('Message about the calculation result.'),
    }),
  },
  async (input: IInputSchema, { interrupt, resumed }) => {
    const resumedData = resumed as { status?: string } | undefined;

    if (resumedData?.status === 'REJECTED') {
      return { status: 'REJECTED', message: 'The user does not want to run the simulation.' };
    }

    if (!resumed) {
      interrupt({
        message: `I'd like to calculate your mortgage with these values:
        • Home Price: $${input.homePrice.toLocaleString()}
        • Down Payment: $${input.downPayment.toLocaleString()}
        • Loan Term: ${input.loanTerm} years
        • Interest Rate: ${input.interestRate}%
        • Zip Code: ${input.zipCode}
        
        Do you approve this calculation?`,
      });
    }

    //! AI Generated Logic
    const { homePrice, downPayment, loanTerm, interestRate } = input;

    // Calculate loan amount
    const loanAmount = homePrice - downPayment;

    // Convert annual interest rate to monthly rate
    const monthlyInterestRate = interestRate / 100 / 12;

    // Convert loan term from years to months
    const numberOfPayments = loanTerm * 12;

    // Calculate monthly payment using the mortgage payment formula
    // M = P [ i(1 + i)^n ] / [ (1 + i)^n - 1 ]
    // where M = monthly payment, P = principal (loan amount), i = monthly interest rate, n = number of payments
    let monthlyPayment: number;

    if (monthlyInterestRate === 0) {
      // If interest rate is 0, simple division
      monthlyPayment = loanAmount / numberOfPayments;
    } else {
      const powerTerm = Math.pow(1 + monthlyInterestRate, numberOfPayments);
      monthlyPayment = (loanAmount * (monthlyInterestRate * powerTerm)) / (powerTerm - 1);
    }

    // Round to 2 decimal places
    monthlyPayment = Math.round(monthlyPayment * 100) / 100;

    // Calculate total amount paid over the loan term
    const totalAmount = Math.round(monthlyPayment * numberOfPayments * 100) / 100;

    // Calculate total interest paid
    const totalInterest = Math.round((totalAmount - loanAmount) * 100) / 100;

    return {
      monthlyPayment,
      totalAmount,
      totalInterest,
    };
  },
);
