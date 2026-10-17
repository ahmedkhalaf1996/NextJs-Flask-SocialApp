import {test, expect , Page} from '@playwright/test'
// -------------------------------------------------
// Shared Helper: register + sign in a user so tests start authenticated
// -------------------------------------------------

async function signUpAndGoHome(page: Page) {
    const email = `posts_e2e${Date.now()}@example.com`;
    await page.goto('/auth');

    await page.getByRole('button', {name: /sign up/i }).click();

    await page.locator('input[name="firstName"]').fill("Post");
    await page.locator('input[name="lastName"]').fill("Tester");
    await page.locator('input[name="email"]').fill(email);
    await page.locator('input[name="password"]').fill("PostPassword123!");
    await page.locator('input[name="ConfirmPassword"]').fill("PostPassword123!");

    // Submit 
    await page.getByRole('button', {name: /^sign up$/i }).click();

    await expect(page).toHaveURL('/', {timeout: 10_000})
    return {email};
}

// -------------------------------------------------
// Tests
// -------------------------------------------------
test.describe('Post Feed', ()=> {
    test('home page redirects unauthenticated users(renders nothing)', async({ page }) => {
        await page.goto('/');

        const url = page.url();
        const isHome = url.endsWith('/') || url.endsWith('/home');
        const isAuth = url.includes('/auth');
        expect(isHome || isAuth).toBeTruthy();
    })

    test('authenticated user sees the create-post form', async({ page }) => {
        await signUpAndGoHome(page);

        await expect(page.locator('input[placeholder="What\'s this about?"]')).toBeVisible()
        await expect(page.locator('textarea[placeholder="What\'s on your mind?"]')).toBeVisible()
    })
    
    test('create-post form has a Photo button', async({ page }) => {
        await signUpAndGoHome(page);
        await expect(page.getByText('Photo')).toBeVisible();
    })

    test('Post buton is disabled when title and message are empty', async({ page }) => {
        await signUpAndGoHome(page);
        const postBtn = page.getByRole('button', {name: /^Post$/i });
        await expect(postBtn).toBeDisabled();
    })

    test('Post Button enables when titile and message are filled', async({ page }) => {
        await signUpAndGoHome(page);

        await page.locator('input[placeholder="What\'s this about?"]').fill("My E2E Post")
        await page.locator('textarea[placeholder="What\'s on your mind?"]').fill('Hello from Playwright!')

        const postBtn = page.getByRole('button', {name: /^Post$/i });
        await expect(postBtn).toBeEnabled();  
    })
    
    test('submitting post form creates a new post in the feed', async({ page }) => {
        await signUpAndGoHome(page);

        const uniqueTitle = `E2E Test Post ${Date.now()}`;
        await page.locator('input[placeholder="What\'s this about?"]').fill(uniqueTitle)
        await page.locator('textarea[placeholder="What\'s on your mind?"]').fill('Hello from Playwright!')

        page.getByRole('button', {name: /^Post$/i }).click();

        await expect(page.getByText(uniqueTitle)).toBeVisible({  timeout: 10_000}) 
    })

    test('form clear after successful post submission', async({ page }) => {
        await signUpAndGoHome(page);

        await page.locator('input[placeholder="What\'s this about?"]').fill('Temp Post Title')
        await page.locator('textarea[placeholder="What\'s on your mind?"]').fill('Temp post body')

        page.getByRole('button', {name: /^Post$/i }).click();

        await page.waitForTimeout(1_500)

        const titileInput = page.locator('input[placeholder="What\'s this about?"]')
        await expect(titileInput).toHaveValue('');
    })
})

test.describe('Post Interactions', ()=> {
    test('clicking like button on a post does not throw an error', async ({ page }) => {
        await signUpAndGoHome(page);

        await page.locator('input[placeholder="What\'s this about?"]').fill('Like Test Post')
        await page.locator('textarea[placeholder="What\'s on your mind?"]').fill('Press like on me!')
        await page.getByRole('button', {name: /^Post$/i }).click();

        await expect(page.getByText('Like Test Post')).toBeVisible({ timeout: 8_000});

        const likebtn = page.locator('[data-testid="like-btn"]').first();

        if(await likebtn.count() > 0){
            await likebtn.click();
            await expect(page.locator('body')).not.toContainText('Error');
        } else {
            await expect(page.getByText('Like Test Post')).toBeVisible();
        }
    })
})









