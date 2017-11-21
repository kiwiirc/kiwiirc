<template>
  <div>
    <label>
      <input type="checkbox" v-model="show_password_box" /> {{$t('password_have')}}
    </label>
    <input-text v-show="show_password_box" :label="$t('password')" v-model="currentValue" type="password" ref="passwordField"/>
  </div>
</template>

<script>
  let Vue = require('vue');


  export default Vue.component('optional-password', {
      props: ['value'],
      data: function data() {
          return {
              show_password_box: false,
          };
      },
      watch: {
          show_password_box(val) {
              if (val === true) {
                  this.$refs.passwordField.focus();
              }
          },
      },
      computed: {
          currentValue: {
              get: function getCurrentValue() {
                  return this.value;
              },
              set: function setCurrentValue(newVal) {
                  this.$emit('input', newVal);
              },
          },
      },
  });
</script>

<style>
</style>
