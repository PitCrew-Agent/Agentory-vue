<script setup>
import sendIcon from '@/assets/icons/dashboard/send-up.png'

defineProps({
  messages: {
    type: Array,
    default: () => [],
  },
  quickCommands: {
    type: Array,
    default: () => [],
  },
})
</script>

<template>
  <aside class="assistant-panel" aria-labelledby="assistant-panel-title">
    <div class="assistant-panel__header">
      <h2 id="assistant-panel-title">Tory</h2>
      <span class="assistant-panel__role">AI 어시스턴트</span>
    </div>

    <div class="assistant-panel__divider"></div>

    <div class="assistant-panel__messages" data-test="assistant-messages">
      <article v-for="message in messages" :key="message.id" class="assistant-panel__message">
        {{ message.text }}
      </article>
    </div>

    <div class="assistant-panel__composer">
      <div v-if="quickCommands.length > 0" class="assistant-panel__quick" data-test="quick-commands">
        <button v-for="command in quickCommands" :key="command.id" type="button">
          {{ command.label }}
        </button>
      </div>

      <div class="assistant-panel__input-row">
        <textarea rows="2" placeholder="Tory에게 메시지를 입력해주세요." aria-label="Tory 메시지" />
        <button type="button" aria-label="메시지 전송">
          <img :src="sendIcon" alt="" width="24" height="24" />
        </button>
      </div>
    </div>
  </aside>
</template>

<style scoped>
.assistant-panel {
  display: flex;
  flex-direction: column;
  min-width: 0;
  height: 100%;
  padding: 0 var(--agentory-spacing-15) var(--agentory-spacing-15);
  overflow: hidden;
  background: var(--agentory-color-bg-app);
  border-radius: var(--agentory-radius-16);
  box-shadow: var(--agentory-shadow-panel);
}

.assistant-panel__header {
  display: flex;
  align-items: center;
  gap: var(--agentory-spacing-8);
  min-height: 28px;
  width: 100%;
  padding: var(--agentory-spacing-20) var(--agentory-spacing-20) var(--agentory-spacing-10);
}

.assistant-panel__header h2 {
  color: var(--agentory-color-bg-primary);
  font-size: var(--agentory-font-size-body-lg);
  font-weight: var(--agentory-font-weight-semi-bold);
  line-height: var(--agentory-line-height-body-lg);
}

.assistant-panel__role {
  color: var(--agentory-color-text-muted);
  font-size: var(--agentory-font-size-caption);
  font-weight: var(--agentory-font-weight-medium);
  line-height: var(--agentory-line-height-caption);
  white-space: nowrap;
}

.assistant-panel__divider {
  height: 2px;
  margin-inline: var(--agentory-spacing-5);
  background: var(--agentory-color-bg-primary);
}

.assistant-panel__messages {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: var(--agentory-spacing-16);
  min-height: 0;
  padding: var(--agentory-spacing-16) var(--agentory-spacing-5);
  overflow-y: auto;
}

.assistant-panel__message {
  width: min(272px, 100%);
  padding: var(--agentory-spacing-12);
  color: var(--agentory-color-text-primary);
  background: var(--agentory-color-bg-surface);
  border-radius: var(--agentory-radius-16);
  font-size: var(--agentory-font-size-body-sm);
  line-height: var(--agentory-line-height-body-sm);
}

.assistant-panel__composer {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--agentory-color-bg-app);
  border-radius: var(--agentory-radius-12);
  box-shadow: var(--agentory-shadow-control);
}

.assistant-panel__quick {
  display: flex;
  flex-wrap: wrap;
  gap: var(--agentory-spacing-4) var(--agentory-spacing-10);
  padding: var(--agentory-spacing-10);
}

.assistant-panel__quick button {
  padding: var(--agentory-spacing-4) var(--agentory-spacing-6);
  color: var(--agentory-color-text-primary);
  background: var(--agentory-color-bg-app);
  border: 0;
  border-radius: var(--agentory-radius-10);
  font-size: var(--agentory-font-size-caption);
  font-weight: var(--agentory-font-weight-light);
  line-height: var(--agentory-line-height-caption);
}

.assistant-panel__input-row {
  display: flex;
  align-items: center;
  gap: var(--agentory-spacing-10);
  min-height: 61px;
  padding: var(--agentory-spacing-8) var(--agentory-spacing-10);
}

.assistant-panel__input-row textarea {
  width: 100%;
  height: 48px;
  padding: var(--agentory-spacing-8);
  resize: none;
  color: var(--agentory-color-text-primary);
  background: var(--agentory-color-bg-app);
  border: 0;
  border-radius: var(--agentory-radius-4);
  outline: none;
  font-size: var(--agentory-font-size-body-sm);
  font-weight: var(--agentory-font-weight-medium);
  line-height: 1.5;
}

.assistant-panel__input-row button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 27px;
  height: 27px;
  padding: var(--agentory-spacing-5);
  background: var(--agentory-color-bg-primary);
  border: 0;
  border-radius: var(--agentory-radius-pill);
  flex: 0 0 auto;
}

.assistant-panel__input-row img {
  width: 19px;
  height: 19px;
  object-fit: contain;
}
</style>
