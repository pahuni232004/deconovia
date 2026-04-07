require("dotenv").config();
const app = require("./app");
const { seedBaseProductsIfEmpty } = require("./seed/seedBaseProducts");

const port = Number(process.env.PORT || 3001);

seedBaseProductsIfEmpty()
  .catch(() => {})
  .finally(() => {
    app.listen(port, () => {
      // eslint-disable-next-line no-console
      console.log(`[backend] listening on :${port}`);
    });
  });

