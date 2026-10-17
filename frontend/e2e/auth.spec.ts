import {test, expect } from '@playwright/test';

test.describe('Authentication Page', ()=> {
    test.beforeEach(async ({ page })=> {
        await page.goto('/auth')
    })

    // ---------------------------------------
    // Page structure
    // ---------------------------------------
    test('should display the auth page', async ({page})=> {
        await expect(page).toHaveURL(/\/auth/);
    })

    test('shows "Welcome back" heading for sign-in view ', async ({ page })=> {
        await expect(page.getByRole('heading', {name: /Welcome back/i })).toBeVisible()
    })

    test('sign-in form has email and password fields', async ({page})=> {
        await expect(page.locator('input[name="email"]')).toBeVisible();
        await expect(page.locator('input[name="password"]')).toBeVisible();

    })


    // ---------------------------------------
    // Toggle between sign-in and sin-up
    // ---------------------------------------
    test('Clicking "Sign UP" link swithches to gregister view', async ({ page })=> {
        await page.getByRole('button', {name: /sign up/i }).click();
        await expect(
            page.getByRole('heading', {name: /Create an account/i})
        ).toBeVisible();
    })
 
    test('register view shows First Name And last name fields', async ({ page })=> {
        await page.getByRole('button', {name: /sign up/i }).click();
        await expect(page.locator('input[name="firstName"]')).toBeVisible();
        await expect(page.locator('input[name="lastName"]')).toBeVisible();
    })

    test('clicking "Sign in" from register view toggles back', async ({ page })=> {
        // switch to register 
        await page.getByRole('button', {name: /sign up/i }).click();
        // switch back to  sign in 
        await page.getByRole('button', {name: /sign in/i }).click();

        await expect(page.getByRole('heading', {name: /Welcome back/i })).toBeVisible()

    })

    // ---------------------------------------
    // form validation & submission
    // ---------------------------------------
    test('submit button is visible on sign-in view', async ({ page })=> {
        await expect(page.getByRole('button', {name: /sign in/i, exact: true})).toBeVisible();
    })

    test('entering invalid credentials shows an error message', async ({ page })=> {
       await page.locator('input[name="email"]').fill('nobody@nowhear.invalid');
       await page.locator('input[name="password"]').fill('woringpassword');

       await page.getByRole('button', {name: /^sign in$/i }).click();

       const errorEl = page.locator('.bg-red-50');
       await expect(errorEl).toBeVisible({timeout: 8_000});
       
    });

    test('password field is of type password masked input', async ({ page })=> {
        const pwInput = page.locator('input[name="password"]');
        await expect(pwInput).toHaveAttribute('type', 'password');
    })

    test('confimrm password appears in register view', async ({ page })=> {
        await page.getByRole('button', {name: /sign up/i }).click();
        await expect(page.locator('input[name="ConfirmPassword"]')).toBeVisible();
    })

    // ---------------------------------------
    // Sign-up happy-path (uses a unique email per test to avoid conflicts)
    // ---------------------------------------
    test('Successful sign-up redirects to homv epage', async ({ page })=> {
        const uniqueEmail = `e2e_${Date.now()}@example.com`;

        await page.getByRole('button', {name: /sign up/i }).click();

        await page.locator('input[name="firstName"]').fill("E2E");
        await page.locator('input[name="lastName"]').fill("Tester");
        await page.locator('input[name="email"]').fill(uniqueEmail);
        await page.locator('input[name="password"]').fill("TestPassword123!");
        await page.locator('input[name="ConfirmPassword"]').fill("TestPassword123!");

        // Submit 
       await page.getByRole('button', {name: /^sign up$/i }).click();

       // should redirect to home
       await expect(page).toHaveURL('/', {timeout: 10_000});

    })

})

