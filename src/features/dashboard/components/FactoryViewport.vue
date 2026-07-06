<template>
  <section class="factory-viewport" aria-label="3D 공장 화면">
    <p>three.js 기반 3D 화면 공간</p>
  </section>
</template>

<style scoped>
.factory-viewport {
  display: flex;
  align-items: flex-start;
  justify-content: center;
  min-height: 0;
  padding-top: 50px;
  overflow: hidden;
  background: var(--agentory-color-bg-app);
  border-radius: var(--agentory-radius-16);
  box-shadow: var(--agentory-shadow-panel);
}

.factory-viewport p {
  color: var(--agentory-color-text-primary);
  font-family: var(--agentory-font-family-base);
  font-size: 26px;
  font-style: italic;
  font-weight: var(--agentory-font-weight-black);
  line-height: var(--agentory-line-height-title);
  text-align: center;
}
</style>
