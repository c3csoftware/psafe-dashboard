const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgres://u6km6999ifptdp:p1bdbc4919efe8393f348668f79f89b2aa9dec6da4b777a59beee435c4d969d68@ccu6unqr99fgui.cluster-czrs8kj4isg7.us-east-1.rds.amazonaws.com:5432/d621gvlrpiqete',
  ssl: {
    rejectUnauthorized: false
  }
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool: pool
};
