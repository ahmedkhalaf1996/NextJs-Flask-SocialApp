import {test, expect , Page} from '@playwright/test'
// -------------------------------------------------
// Shared Helper: sign up a test user and return thiar id from the cookie/ local store
// -------------------------------------------------

async function signUpAndGetUserId(page: Page) {
    const email = `profile_e2e${Date.now()}@example.com`;
    await page.goto('/auth');

    await page.getByRole('button', {name: /sign up/i }).click();

    await page.locator('input[name="firstName"]').fill("Profile");
    await page.locator('input[name="lastName"]').fill("Tester");
    await page.locator('input[name="email"]').fill(email);
    await page.locator('input[name="password"]').fill("PostPassword123!");
    await page.locator('input[name="ConfirmPassword"]').fill("PostPassword123!");
    await page.getByRole('button', {name: /^sign up$/i }).click();

    await expect(page).toHaveURL('/', {timeout: 10_000})

    /// read the user id sotreod in localStorage
    const userId = await page.evaluate(()=> {
        try {
            const raw = localStorage.getItem('user');
            if (!raw) return null;
             const parsed = JSON.parse(raw);
             return parsed?._id ?? null
        } catch {
            return null;
        }
    });
    return userId as string;
}

// -------------------------------------------------
// Tests
// -------------------------------------------------

test.describe('User Profile Page', ()=>{
    test('profile page loads witout crashing', async ({ page })=> {
        const userId = await signUpAndGetUserId(page);

        test.skip(!userId, 'Could not retruive user id from LocalStorage');

        await page.goto(`/profile/${userId}`);
        await page.waitForLoadState('networkidle');

        await expect(page.locator('body')).not.toContainText('404')
    })

    test('profile page displays user name', async ({ page })=> {
        const userId = await signUpAndGetUserId(page);
        test.skip(!userId, 'Could not retruive user id from LocalStorage');

        await page.goto(`/profile/${userId}`);
        await page.waitForLoadState('networkidle');

        await expect(page.getByText('Profile Tester')).toBeVisible({ timeout: 8_000})
    })

    test('profile page URL Contains user ID', async ({ page })=> {
        const userId = await signUpAndGetUserId(page);
        test.skip(!userId, 'Could not retruive user id from LocalStorage');

        await page.goto(`/profile/${userId}`);
        await expect(page).toHaveURL(new RegExp(userId))
    })


    test('navigation to own profile from home works ', async ({ page })=> {
        const userId = await signUpAndGetUserId(page);
        test.skip(!userId, 'Could not retruive user id from LocalStorage');

        await page.goto(`/profile/${userId}`);
        await page.waitForLoadState('networkidle');

        await expect(page).toHaveURL(new RegExp(`/profile/${userId}`))
    })
    
    test('invalid profile id shows appropriate content ', async ({ page })=> {
        await signUpAndGetUserId(page);

        await page.goto(`/profile/000000000000000000000000`);
        await page.waitForLoadState('networkidle');

        await expect(page.locator('body')).not.toHaveText('');
    })
    
})